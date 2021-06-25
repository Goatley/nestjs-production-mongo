import * as mongoose from 'mongoose';
import { IUser } from '../interfaces/user.interface';

export const UserSchema = new mongoose.Schema<IUser>(
	{
		email: String,
		organizations: [
			{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
		],
		projects: [String],
		groups: [String],
	},
	{
		timestamps: true,
	},
);
