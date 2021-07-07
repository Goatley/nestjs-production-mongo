import { Date, Document, Types } from 'mongoose';
import { IUser, IUserToken } from 'src/user/interfaces/user.interface';

export type IOrganizationDocument = IOrganization & Document;

export interface IOrganization {
	_id: Types.ObjectId;
	name: string;
	description?: string;
	users: Array<Types.ObjectId>;
	admins: Array<Types.ObjectId>;
	projects: Array<Types.ObjectId>;
	user_groups: Array<Types.ObjectId>;
	updatedBy: Types.ObjectId;
	createdBy: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

//event payload when an org is created/modified
export interface IOrganizationEvent {
	organization: IOrganization;
	user: IUserToken;
}

//payload for when organization user management happens
export interface IOrganizationUserUpdatedEvent extends IOrganizationEvent {
	updatedUser: IUser;
}

export interface IOrganizationUserDeletedEvent extends IOrganizationEvent {
	deletedUser: IUser;
}

//payload for when organization admin management happens
export interface IOrganizationAdminUpdatedEvent extends IOrganizationEvent {
	updatedAdmin: IUser;
}

export interface IOrganizationAdminDeletedEvent extends IOrganizationEvent {
	deletedAdmin: IUser;
}
