import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { InjectedConstants } from '../../src/config/constants.config';

let mongod: MongoMemoryServer;

export const testDatabaseProviders = [
	{
		//we're using the same injection container as the regular DB... just depends which database module we import
		provide: InjectedConstants.database_connection,
		useFactory: async (): Promise<typeof mongoose> => {
			mongod = await MongoMemoryServer.create();

			const mongoUri = mongod.getUri();

			return mongoose.connect(mongoUri, {
				useNewUrlParser: true,
				useFindAndModify: false,
				useUnifiedTopology: true,
			});
		},
	},
];

export const closeInMongodConnection = async () => {
	await mongoose.disconnect();
	if (mongod) await mongod.stop();
};
