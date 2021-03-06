import { Module, Logger } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationService } from './services/organization.service';
import { OrganizationUserService } from './services/organization-user.service';
import { OrganizationAdminService } from './services/organization-admin.service';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationUserController } from './controllers/organization-user.controller';
import { OrganizationAdminController } from './controllers/organization-admin.controller';
import { organizationProviders } from './organization.providers';
import { UserModule } from 'src/user/user.module';
import { OrganizationPermissions } from './permissions/organization.permissions';
import { OrganizationEventSubscriber } from './subscribers/organization.subscriber';
import { OrganizationUserEventSubscriber } from './subscribers/organization-user.subscriber';

@Module({
	imports: [DatabaseModule, UserModule],
	controllers: [
		OrganizationController,
		OrganizationUserController,
		OrganizationAdminController,
	],
	providers: [
		Logger,
		OrganizationService,
		OrganizationUserService,
		OrganizationAdminService,
		OrganizationPermissions,
		OrganizationEventSubscriber,
		OrganizationUserEventSubscriber,
		...organizationProviders,
	],
	exports: [...organizationProviders],
})
export class OrganizationModule {}
