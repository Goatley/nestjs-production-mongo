import { Module, Logger } from '@nestjs/common';
import { OrganizationAdminService, OrganizationService, OrganizationUserService } from './organization.service';
import { OrganizationAdminController, OrganizationController, OrganizationUserController } from './organization.controller';
import { organizationProviders } from './organization.providers';
import { UserModule } from 'src/user/user.module';
import { OrganizationPermissions } from './permissions/organization.permissions';
import { OrganizationEventListener } from './subscribers/organization-created.subscriber';

@Module({
  imports: [
    UserModule,
  ],
  controllers: [OrganizationController, OrganizationUserController, OrganizationAdminController],
  providers: [Logger, OrganizationService, OrganizationUserService, OrganizationAdminService,OrganizationPermissions, OrganizationEventListener, ...organizationProviders],
  exports: [...organizationProviders]
})
export class OrganizationModule {}
