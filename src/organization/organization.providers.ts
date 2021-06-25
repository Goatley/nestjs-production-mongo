import { Connection } from 'mongoose';
import { OrganizationSchema } from './schemas/organization.schema';
import { InjectedConstants } from 'src/config/constants.config';

export const organizationProviders = [
	{
		provide: InjectedConstants.organization_model,
		useFactory: (connection: Connection) =>
			connection.model('Organization', OrganizationSchema),
		inject: [InjectedConstants.database_connection],
	},
];
