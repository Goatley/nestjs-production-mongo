import * as mongoose from 'mongoose';
import { InjectedConstants } from '../config/constants.config';

export const databaseProviders = [
	{
		provide: InjectedConstants.database_connection,
		useFactory: (): Promise<typeof mongoose> => {
			return mongoose.connect(process.env.MONGODB_HOST, {
				useNewUrlParser: true,
				useFindAndModify: false,
				useUnifiedTopology: true,
			});
		},
	},
];
