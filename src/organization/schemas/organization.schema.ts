import * as mongoose from 'mongoose';
import { IOrganization } from '../interfaces/organization.interface';

export const OrganizationSchema = new mongoose.Schema<IOrganization>(
	{
		name: String,
		description: String,
		admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		projects: [String],
		user_groups: [String],
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	},
	{
		timestamps: true,
		toObject: {
			versionKey: false,
		},
	},
);
