import { Connection } from 'mongoose';
import { InjectedConstants } from '../config/constants.config';
import { UserSchema } from './schemas/user.schema';

export const userProviders = [
	{
		provide: InjectedConstants.user_model,
		useFactory: (connection: Connection) => connection.model('User', UserSchema),
		inject: [InjectedConstants.database_connection],
	},
];
