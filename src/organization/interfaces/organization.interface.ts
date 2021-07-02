import { Date, Document, Types } from 'mongoose';
import { IUserToken } from 'src/user/interfaces/user.interface';

export interface IOrganizationDocument extends Document {
	name: string;
	description?: string;
	users: Array<Types.ObjectId>;
	admins: Array<Types.ObjectId>;
	projects: Array<Types.ObjectId>;
	user_groups: Array<Types.ObjectId>;
	updatedBy: Types.ObjectId;
	createdBy: Types.ObjectId;
}

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
	updatedAt: Date;
	createdAt: Date;
}

//event payload when an org is created/modified
export interface IOrganizationEvent {
	organization: IOrganization;
	user: IUserToken;
}

//payload for when organization user management happens
export interface IOrganizationUserUpdatedEvent extends IOrganizationEvent {
	updatedUser: string;
}

export interface IOrganizationUserDeletedEvent extends IOrganizationEvent {
	deletedUser: string;
}

//payload for when organization admin management happens
export interface IOrganizationAdminUpdatedEvent extends IOrganizationEvent {
	updatedAdmin: string;
}

export interface IOrganizationAdminDeletedEvent extends IOrganizationEvent {
	deletedAdmin: string;
}
