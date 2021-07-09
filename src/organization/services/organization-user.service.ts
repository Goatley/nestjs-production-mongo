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
	IOrganizationUserAddedEvent,
	IOrganizationUserCreatedEvent,
	IOrganizationUserDeletedEvent,
} from '../interfaces/organization.interface';
import { InjectedConstants } from '../../config/constants.config';
import { UserListDto } from '../dto/user-list.dto';
import { Populated } from 'src/util/populatedType.util';
import { CreateOrganizationUserDto } from '../dto/create-organization-user.dto';

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

	async create(
		organizationId: string,
		createOrganizationUserDto: CreateOrganizationUserDto,
		user: IUserToken,
	): Promise<IUser> {
		//first, let's do a permissions check
		const organization = await this.organizationModel
			.findOne({ _id: organizationId })
			.lean()
			.orFail();

		if (
			!this.organizationPermissions.checkPermission(
				Action.Manage,
				organization,
				user,
			)
		) {
			throw new InsufficientPermissionError(
				'You have insufficient permissions to add users to this organization.  You must be an admin.',
			);
		}

		//first, let's see if we have a user already registered to that email
		let newUser = await this.userModel.findOne({
			email: createOrganizationUserDto.userEmail,
		});

		//if not, let's create one
		if (!newUser) {
			//create the new user and add the organization to it
			newUser = await this.userModel.create({
				email: createOrganizationUserDto.userEmail,
				organizations: [organization._id],
			});

			//now let's make sure the user is a part of the organization
			const updatedOrg = await this.organizationModel
				.findOneAndUpdate(
					{ _id: organization._id },
					{
						$addToSet: { users: newUser._id },
					},
					{ new: true },
				)
				.lean();

			//now, let's kick off the event for a new user created for this org
			const orgUserCreatedEvent: IOrganizationUserCreatedEvent = {
				organization: updatedOrg,
				user: user,
				createdUser: newUser,
			};

			this.eventEmitter.emit(OrganizationEvents.userCreated, orgUserCreatedEvent);

			this.logger.log(
				`New user ${newUser._id.toHexString()} was created and added to organization ${updatedOrg._id.toHexString()}`,
			);

			return newUser;
		} else {
			//if the user existed, let's make sure they don't already exist in the org
			if (
				organization.users.some(
					(userId) => userId.toHexString() === newUser._id.toHexString(),
				)
			) {
				throw new ActionNotAllowedError(
					'Unable to add this user as they are already a part of this organization.',
				);
			}
			//let's just add them to the org and send out an org user added event

			//first, add the org to the user
			const updatedUser = await this.userModel
				.findOneAndUpdate(
					{ _id: newUser._id },
					{ $addToSet: { organizations: organization._id } },
					{ new: true },
				)
				.lean();

			//now, let's add the user to the org
			const updatedOrg = await this.organizationModel
				.findOneAndUpdate(
					{ _id: organization._id },
					{
						$addToSet: { users: updatedUser._id },
					},
					{ new: true },
				)
				.lean();

			//now send out the event for a user added
			const orgUserAddedEvent: IOrganizationUserAddedEvent = {
				organization: updatedOrg,
				user: user,
				addedUser: updatedUser,
			};

			this.eventEmitter.emit(OrganizationEvents.userAdded, orgUserAddedEvent);

			this.logger.log(
				`Existing user ${updatedUser._id.toHexString()} added to organization ${organization._id.toHexString()}`,
			);

			return updatedUser;
		}
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
