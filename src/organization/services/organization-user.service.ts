import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { OrganizationEvents } from '../events/organization.events';
import { IUser, IUserToken } from '../../user/interfaces/user.interface';
import {
	InsufficientPermissionError,
	ActionNotAllowedError,
} from '../../errors/errors';
import { OrganizationPermissions } from '../permissions/organization.permissions';
import { Action } from '../../permissions/actions';
import {
	IOrganization,
	IOrganizationDocument,
	IOrganizationUserDeletedEvent,
	IOrganizationUserUpdatedEvent,
} from '../interfaces/organization.interface';
import { InjectedConstants } from '../../config/constants.config';
import { UpdateOrganizationUsersDto } from '../dto/update-organization-users.dto';
import { UserListDto } from '../dto/user-list.dto';
import { Populated } from 'src/util/populatedType.util';

/**
 * Service class for Organization User management
 *
 */

@Injectable()
export class OrganizationUserService {
	constructor(
		@Inject(InjectedConstants.organization_model)
		private organizationModel: Model<IOrganizationDocument>,
		@Inject(InjectedConstants.user_model) private userModel: Model<IUser>,
		private eventEmitter: EventEmitter2,
		private organizationPermissions: OrganizationPermissions,
		private readonly logger: Logger,
	) {}

	/**
	 *
	 * @param organizationId - Org Id passed to path
	 * @param user - IUserToken
	 * @permission - requires that the user supplied by the token be either an admin or a user of the organization
	 * @returns Finds all users that belong to an organization and returns them.  Will return an object containing the admins array and the users array
	 */
	async findAll(organizationId: string, user: IUserToken): Promise<UserListDto> {
		//first let's grab our doc
		const organization = await this.organizationModel
			.findById(organizationId)
			.lean()
			.orFail();

		//now, let's verify if the user has permission to view.  Either an admin or user of the org needs READ
		if (
			!this.organizationPermissions.checkPermission(
				Action.Read,
				organization,
				user,
			)
		) {
			throw new InsufficientPermissionError();
		}

		const populatedOrg = (await this.organizationModel
			.findOne({ _id: organization._id })
			.populate('users', '_id email')
			.lean()
			.orFail()) as Populated<IOrganization, 'users'>;

		//let's return the users and admins of the org
		return {
			_id: populatedOrg._id,
			users: populatedOrg.users,
		};
	}

	/**
	 * Updates the user or admin list of an organization to ONLY ADD new users.
	 *
	 * @param organizationId
	 * @param UpdateOrganizationUsersDto
	 * @param user
	 * @event releases org users updated event
	 * @permission requires admin access to the organization
	 * @returns returns the updated users/admins list on the named org
	 */
	async update(
		organizationId: string,
		updateOrganizationUsersDto: UpdateOrganizationUsersDto,
		user: IUserToken,
	): Promise<UserListDto> {
		//let's retrieve our org and make sure it exists
		const organization = await this.organizationModel
			.findOne({ _id: organizationId })
			.lean()
			.orFail();

		//check permissions - you MUST be an admin to update these lists
		if (
			!this.organizationPermissions.checkPermission(
				Action.Update,
				organization,
				user,
			)
		) {
			throw new InsufficientPermissionError();
		}

		//let's build our update DAO
		const updateOrgUsersDao = {
			$addToSet: {
				users: { $each: updateOrganizationUsersDto.users },
			},
			updatedBy: user._id,
		};

		//let's update our org and save the returned NEW copy
		const updatedOrg = (await this.organizationModel
			.findOneAndUpdate({ _id: organization._id }, updateOrgUsersDao, {
				new: true,
			})
			.populate('users', '_id email')
			.lean()
			.orFail()) as Populated<IOrganization, 'users'>;

		//now let's add the org to each of the user's accounts
		const newOrgUsers = await Promise.all(
			updateOrganizationUsersDto.users.map((userId) => {
				return this.userModel.findOneAndUpdate(
					{ _id: userId },
					{
						$addToSet: { organizations: updatedOrg._id },
					},
					{
						new: true,
					},
				);
			}),
		);

		//emit our updated users list event
		newOrgUsers.forEach((updatedUser) => {
			const orgUserUpdatedEvent: IOrganizationUserUpdatedEvent = {
				organization: updatedOrg,
				user: user,
				updatedUser: updatedUser,
			};

			this.eventEmitter.emit(OrganizationEvents.userUpdated, orgUserUpdatedEvent);
		});

		return {
			_id: updatedOrg._id,
			users: updatedOrg.users,
		};
	}

	/**
	 * deletes a single user based on user and organization passed into the route param
	 *
	 * @param organizationId
	 * @param userIdToDelete
	 * @param user
	 * @event emits the organizationUserDeleted event
	 * @permission Requires that the user requesting the action be an admin for the organization
	 * @returns Returns the updated list of users for an organization post-delete
	 */
	async remove(
		organizationId: string,
		userIdToDelete: string,
		user: IUserToken,
	): Promise<UserListDto> {
		//first, let's grab our organization
		//keeping as a document for now
		const organization = await this.organizationModel
			.findById(organizationId)
			.orFail();

		//lets also make sure we can actually retrieve our user or throw an error if not
		await this.userModel.findOne({ _id: userIdToDelete }).orFail();

		//let's see if we have permission to remove the users (aka is an admin)
		if (
			!this.organizationPermissions.checkPermission(
				Action.Delete,
				organization,
				user,
			)
		) {
			throw new InsufficientPermissionError();
		}

		//check to see if the user is an admin - we don't want to be able to remove the user from 'users' if they are an 'admin'.  They must remove them as an admin first, then as a user
		//we don't ever have to worry about removing the last user, as that would be yourself, and you can't remove the last admin which would need to happen first
		if (organization.admins.includes(Types.ObjectId(userIdToDelete))) {
			throw new ActionNotAllowedError(
				'You cannot remove a user that is also an admin of an organization.  Please remove them as an admin first.',
			);
		}

		//lets run update query to remove the users or admin from the org
		const updatedOrg = (await this.organizationModel
			.findOneAndUpdate(
				{ _id: organization._id },
				{
					updatedBy: user._id,
					$pull: {
						users: Types.ObjectId(userIdToDelete),
					},
				},
				{ new: true },
			)
			.populate('users', '_id email')
			.lean()
			.orFail()) as Populated<IOrganizationDocument, 'users'>;

		//now we need to remove the org from each of the users removed
		const deletedUser = await this.userModel
			.findByIdAndUpdate(userIdToDelete, {
				$pull: {
					organizations: updatedOrg._id,
				},
			})
			.lean()
			.orFail();

		//now let's emit our event to notify users/admins were removed
		const orgUserDeletedEvt: IOrganizationUserDeletedEvent = {
			organization: updatedOrg,
			user: user,
			deletedUser: deletedUser,
		};

		this.eventEmitter.emit(OrganizationEvents.userDeleted, orgUserDeletedEvt);

		//FINALLY let's return the updated org
		return {
			_id: updatedOrg._id,
			users: updatedOrg.users,
		};
	}
}
