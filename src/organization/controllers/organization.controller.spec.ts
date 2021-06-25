import { Test, TestingModule } from '@nestjs/testing';
import {
	OrganizationController,
	OrganizationUserController,
	OrganizationAdminController,
} from './organization.controller';
import { OrganizationService } from '../services/organization.service';
import { OrganizationAdminService } from '../services/organizationAdmin.service';
import { OrganizationUserService } from '../services/organizationUser.service';

describe('The OrganizationController ', () => {
	//test each of our controllers
	let controllerRoot: OrganizationController;
	let controllerUser: OrganizationUserController;
	let controllerAdmin: OrganizationAdminController;

	//spy services
	let spyServiceRoot: OrganizationService;
	let spyServiceUser: OrganizationUserService;
	let spyServiceAdmin: OrganizationAdminService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [OrganizationController],
			providers: [OrganizationService],
		}).compile();

		controllerRoot = module.get<OrganizationController>(OrganizationController);
		controllerUser = module.get<OrganizationUserController>(
			OrganizationUserController,
		);
		controllerAdmin = module.get<OrganizationAdminController>(
			OrganizationAdminController,
		);

		spyServiceRoot = module.get<OrganizationService>(OrganizationService);
		spyServiceUser = module.get<OrganizationUserService>(OrganizationUserService);
		spyServiceAdmin = module.get<OrganizationAdminService>(
			OrganizationAdminService,
		);
	});

	describe('When receiving a GET request on root ', () => {
		it('Should list call findAll on the Organization Service', async () => {});
	});
});
