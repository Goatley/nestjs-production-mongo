import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../../../test/mongooseTestDb/testDatabase.module';
import { closeInMongodConnection } from '../../../../test/mongooseTestDb/testDatabase.providers';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationPermissions } from '../../permissions/organization.permissions';
import { IOrganization } from '../../interfaces/organization.interface';
import { OrganizationService } from '../../services/organization.service';
import { IUser } from '../../../user/interfaces/user.interface';
import { InjectedConstants } from '../../../config/constants.config';
import { Model } from 'mongoose';
import { mockOrganization } from '../mocks/organization.mocks';
import * as mockedUsers from '../mocks/users.mocks';
import {
	InsufficientPermissionError,
	ActionNotAllowedError,
} from '../../../errors/errors';
import { UserModule } from '../../../user/user.module';
import { organizationProviders } from '../../organization.providers';
import { userProviders } from '../../../user/user.providers';

describe('OrganizationService', () => {
	let orgService: OrganizationService;

	let orgModel: Model<IOrganization>;
	let userModel: Model<IUser>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [TestDatabaseModule],
			providers: [
				EventEmitter2,
				OrganizationService,
				OrganizationPermissions,
				Logger,
				...organizationProviders,
				...userProviders,
			],
		}).compile();

		orgService = module.get<OrganizationService>(OrganizationService);

		orgModel = module.get(InjectedConstants.organization_model);
		userModel = module.get(InjectedConstants.user_model);

		//let's add in our fake org
		await orgModel.create(mockOrganization);
	});

	describe('Testing', () => {
		it('should be here', async () => {
			await expect(orgModel.findById(mockOrganization._id)).resolves.
		});
	});

	afterAll(async () => {
		await closeInMongodConnection();
	});
});
