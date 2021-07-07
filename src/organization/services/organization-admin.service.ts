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
	IOrganizationDocument,
	IOrganizationAdminDeletedEvent,
	IOrganization,
	IOrganizationAdminUpdatedEvent,
} from '../interfaces/organization.interface';
import { InjectedConstants } from '../../config/constants.config';
import { UpdateOrganizationAdminsDto } from '../dto/update-organization-admins.dto';
import { AdminListDto } from '../dto/admin-list.dto';
import { Populated } from 'src/util/populatedType.util';

/**
 * Service class for Organization Admin management
 *
 */

@Injectable()
export class OrganizationAdminService {
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
	async findAll(
		organizationId: string,
		user: IUserToken,
	): Promise<AdminListDto> {
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

		//let's populate our users to grab the emails/any other info
		const populatedOrganization = (await this.organizationModel
			.findOne({ _id: organization._id })
			.populate('admins', '_id email')
			.lean()
			.orFail()) as Populated<IOrganization, 'admins'>;

		//let's return the users and admins of the org
		return {
			_id: populatedOrganization._id,
			admins: populatedOrganization.admins,
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
	): Promise<AdminListDto> {
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

		//if the user is already an admin, let's reject
		if (
			organization.admins.some(
				(adminId) => adminId.toHexString() === updateOrganizationAdminsDto.adminId,
			)
		) {
			throw new ActionNotAllowedError(
				'This user is already an admin for the organization.',
			);
		}
		//let's build our update DAO
		//we'll want to add the user to the org as both an admin and a user
		const updateOrgAdminsDao = {
			$addToSet: {
				admins: updateOrganizationAdminsDto.adminId,
				users: updateOrganizationAdminsDto.adminId,
			},
			updatedBy: user._id,
		};

		//let's use addToSet to push these new users or admins to our array
		const updatedOrg = (await this.organizationModel
			.findOneAndUpdate({ _id: organization._id }, updateOrgAdminsDao, {
				new: true,
			})
			.populate('admins', '_id, email')
			.lean()
			.orFail()) as Populated<IOrganization, 'admins'>;

		//now let's add the organization as an org to the users updated
		//should do nothing if they're already a user
		//we don't care about order that these run in, just that they all finish.  We'll run them in parallel
		const newAdmin = await this.userModel.findOneAndUpdate(
			{ _id: updateOrganizationAdminsDto.adminId },
			{
				$addToSet: { organizations: updatedOrg._id },
			},
			{ new: true },
		);

		//let's emit our admin updated events
		const orgAdminUpdatedEvt: IOrganizationAdminUpdatedEvent = {
			organization: updatedOrg,
			user: user,
			updatedAdmin: newAdmin,
		};

		this.eventEmitter.emit(OrganizationEvents.adminUpdated, orgAdminUpdatedEvt);

		return {
			_id: updatedOrg._id,
			admins: updatedOrg.admins,
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
	): Promise<AdminListDto> {
		//first, let's grab our organization
		const organization = await this.organizationModel
			.findById(organizationId)
			.lean()
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

		//now, let's make sure the user exists too
		//doing this BEFORE the check to see if they're even an admin for the query responses to be a bit more helpful
		const removedAdmin = await this.userModel
			.findOne({ _id: adminIdToDelete })
			.lean()
			.orFail();

		//let's see if this user is even an admin... if not, throw ActionNotAllowed error back at 'em
		if (
			!organization.admins.some(
				(adminId) => adminId.toHexString() == adminIdToDelete,
			)
		) {
			throw new ActionNotAllowedError(
				'User requested to delete is not an admin of this organization.',
			);
		}

		//let's make sure we aren't removing the last admin.  Instead, they would need to delete the org.
		//we only want to be able to remove 1 admin at a time - this will be a safety check for us
		if (organization.admins.length === 1) {
			throw new ActionNotAllowedError(
				"Error - you can't remove the last admin from an organization.  Did you want to delete the organization instead?",
			);
		}

		//lets run update query to remove the users or admin from the org
		const updatedOrg = (await this.organizationModel
			.findOneAndUpdate(
				{ _id: organization._id },
				{
					updatedBy: user._id,
					$pull: {
						admins: Types.ObjectId(adminIdToDelete),
					},
				},
				{ new: true },
			)
			.lean()
			.populate('admins', '_id email')
			.orFail()) as Populated<IOrganization, 'admins'>;

		//since you can't remove a user that is still an admin, the user removal will come last.  Thus, we can ignore removing this org from the user document

		//now let's emit our event to notify users/admins were removed
		const orgUserDeletedEvt: IOrganizationAdminDeletedEvent = {
			organization: updatedOrg,
			user: user,
			deletedAdmin: removedAdmin,
		};

		this.eventEmitter.emit(OrganizationEvents.adminDeleted, orgUserDeletedEvt);

		//FINALLY let's return the updated org
		return {
			_id: updatedOrg._id,
			admins: updatedOrg.admins,
		};
	}
}
