import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from '../../controllers/organization.controller';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationServiceStub } from '../stubs/services.stub';
import {
	mockUserToken,
	mockAdminToken,
	mockNonAuthUserToken,
} from '../mocks/users.mocks';
import { mockOrganization } from '../mocks/organization.mocks';

describe('The OrganizationController ', () => {
	//test each of our controllers
	let controller: OrganizationController;

	//spy services
	let spyService: OrganizationService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [OrganizationController],
			providers: [
				{
					provide: OrganizationService,
					useClass: OrganizationServiceStub,
				},
			],
		}).compile();

		controller = module.get<OrganizationController>(OrganizationController);

		spyService = module.get<OrganizationService>(OrganizationService);
	});

	//Get on ROOT
	describe('Receiving a GET requests on root with NO PARAMS', () => {
		describe('with an authorized JWT', () => {
			it('Should call findAll on the Organization Service.', async () => {
				const findAllSpy = jest.spyOn(spyService, 'findAll');

				await controller.findAll({ user: mockUserToken });
				await controller.findAll({ user: mockAdminToken });
				await controller.findAll({ user: mockNonAuthUserToken });

				//should be called twice
				expect(findAllSpy).toBeCalledTimes(3);
			});
		});
	});

	//Get on Root/:OrganizationId
	describe('Receiving a GET request with the OrganizationID as a route param', () => {
		describe('With an authorized JWT', () => {
			it('Should call findOne on the Organization Service.', async () => {
				const findOneSpy = jest.spyOn(spyService, 'findOne');

				await controller.findOne(mockOrganization._id.toHexString(), {
					user: mockUserToken,
				});
				await controller.findOne(mockOrganization._id.toHexString(), {
					user: mockAdminToken,
				});
				await controller.findOne(mockOrganization._id.toHexString(), {
					user: mockNonAuthUserToken,
				});

				expect(findOneSpy).toBeCalledTimes(3);
			});
		});
	});

	//POST to create on ROOT
	describe('Receiving a POST request on ROOT', () => {
		describe('With an authorized JWT', () => {
			it('Should call create on the Organization Service.', async () => {
				const createSpy = jest.spyOn(spyService, 'create');

				await controller.create(
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockUserToken,
					},
				);
				await controller.create(
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockAdminToken,
					},
				);
				await controller.create(
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockNonAuthUserToken,
					},
				);

				expect(createSpy).toBeCalledTimes(3);
			});
		});
	});

	//receiving a PATCH
	describe('Receiving a PATCH request on ROOT with the OrganizationId as a route param', () => {
		describe('With an authorized JWT', () => {
			it('Should call update on the Organization Service.', async () => {
				const updateSpy = jest.spyOn(spyService, 'update');

				await controller.update(
					mockOrganization._id.toHexString(),
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockUserToken,
					},
				);
				await controller.update(
					mockOrganization._id.toHexString(),
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockAdminToken,
					},
				);
				await controller.update(
					mockOrganization._id.toHexString(),
					{ name: mockOrganization.name, description: mockOrganization.description },
					{
						user: mockNonAuthUserToken,
					},
				);

				expect(updateSpy).toBeCalledTimes(3);
			});
		});
	});

	//when deleting an org
	describe('When calling DELETE on ROOT with an OrganizationId as a route param', () => {
		describe('With an authorized JWT', () => {
			it('Should call the remove function of the Organization Service', async () => {
				const deleteSpy = jest.spyOn(spyService, 'remove');

				await controller.remove(mockOrganization._id.toHexString(), {
					user: mockUserToken,
				});
				await controller.remove(mockOrganization._id.toHexString(), {
					user: mockAdminToken,
				});
				await controller.remove(mockOrganization._id.toHexString(), {
					user: mockNonAuthUserToken,
				});

				expect(deleteSpy).toBeCalledTimes(3);
			});
		});
	});
});
