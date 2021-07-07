import { Types, Document } from 'mongoose';

export interface IUser {
	_id: Types.ObjectId;
	email: string;
	organizations: Array<Types.ObjectId>;
	projects: Array<string>;
}

export type IUserDocument = IUser & Document;

export interface IUserToken {
	_id: Types.ObjectId;
	email: string;
	permissions: Array<string>;
}
