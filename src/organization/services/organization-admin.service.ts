import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { OrganizationEvents } from '../events/organization.events';
import { IUser, IUserToken } from '../..//user/interfaces/user.interface';
import {
	InsufficientPermissionError,
	ActionNotAllowedError,
} from '../../errors/errors';
import { OrganizationPermissions } from '../permissions/organization.permissions';
import { Action } from '../../permissions/actions';
import {
	IOrganization,
	IOrganizationAdminDeletedEvent,
} from '../interfaces/organization.interface';
import { InjectedConstants } from '../../config/constants.config';
import { UpdateOrganizationAdminsDto } from '../dto/update-organization-admins.dto';

/**
 * Service class for Organization Admin management
 *
 */

@Injectable()
export class OrganizationAdminService {
	constructor(
		@Inject(InjectedConstants.organization_model)
		private organizationModel: Model<IOrganization>,
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
	async findAll(organizationId: string, user: IUserToken) {
		//first let's grab our doc
		const organization = await this.organizationModel
			.findById(organizationId)
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

		//let's populate our users to grab the emails/any other info
		await organization.populate('admins', '_id email').execPopulate();

		//let's return the users and admins of the org
		return {
			_id: organization._id,
			admins: organization.admins,
		};
	}

	/**
	 * Updates the admin list of an organization to ONLY ADD new users.
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
		updateOrganizationAdminsDto: UpdateOrganizationAdminsDto,
		user: IUserToken,
	) {
		//let's retrieve our org and make sure it exists
		const organization = await this.organizationModel
			.findOne({ _id: organizationId })
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
		//we'll want to add the user to the org as both an admin and a user
		const updateOrgAdminsDao = {
			$addToSet: {
				admins: { $each: updateOrganizationAdminsDto.admins },
				users: { $each: updateOrganizationAdminsDto.admins },
			},
			updatedBy: user._id,
		};

		//let's use addToSet to push these new users or admins to our array
		await organization.updateOne(updateOrgAdminsDao, { new: true });

		//now let's add the organization as an org to the users updated
		//we don't care about order that these run in, just that they all finish.  We'll run them in parallel
		await Promise.all(
			updateOrganizationAdminsDto.admins.map((adminId) => {
				return this.userModel.findByIdAndUpdate(adminId, {
					$addToSet: { organizations: organization._id },
				});
			}),
		);

		//let's emit our admin updated events
		updateOrganizationAdminsDto.admins.forEach((admin) => {
			this.eventEmitter.emit(OrganizationEvents.updated, {
				organization: organization,
				user: user,
				updatedAdmin: admin,
			});
		});

		return {
			_id: organization._id,
			admins: organization.admins,
		};
	}

	/**
	 * deletes a singular admin based on user and organization passed into the route param
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
		adminIdToDelete: string,
		user: IUserToken,
	) {
		//first, let's grab our organization
		const organization = await this.organizationModel
			.findById(organizationId)
			.orFail();

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

		//let's make sure we aren't removing the last admin.  Instead, they would need to delete the org.
		//we only want to be able to remove 1 admin at a time - this will be a safety check for us
		if (organization.admins.length === 1) {
			throw new ActionNotAllowedError(
				"Error - you can't remove the last admin from an organization.  Did you want to delete the organization instead?",
			);
		}

		//lets run update query to remove the users or admin from the org
		await organization
			.updateOne({
				updatedBy: user._id,
				$pull: {
					admins: Types.ObjectId(adminIdToDelete),
				},
			})
			.orFail();

		//since you can't remove a user that is still an admin, the user removal will come last.  Thus, we can ignore removing this org from the user document

		//now let's emit our event to notify users/admins were removed
		const orgUserDeletedEvt: IOrganizationAdminDeletedEvent = {
			organization: organization,
			user: user,
			deletedAdmin: adminIdToDelete,
		};

		this.eventEmitter.emit(OrganizationEvents.userDeleted, orgUserDeletedEvt);

		//FINALLY let's return the updated org
		return {
			_id: organization._id,
			admins: organization.admins,
		};
	}
}
