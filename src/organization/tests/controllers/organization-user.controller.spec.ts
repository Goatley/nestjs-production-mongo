import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUserController } from '../../controllers/organization-user.controller';
import { OrganizationUserService } from '../../services/organization-user.service';
import { OrganizationUserServiceStub } from '../stubs/services.stub';
import {
	mockOrganization,
	mockUserToken,
	mockAdminToken,
	mockNonAuthUserToken,
} from '../mocks/organization.mocks';

describe('The OrganizationUserController ', () => {
	//test each of our controllers
	let controller: OrganizationUserController;

	//spy services
	let spyService: OrganizationUserService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [OrganizationUserController],
			providers: [
				{
					provide: OrganizationUserService,
					useClass: OrganizationUserServiceStub,
				},
			],
		}).compile();

		controller = module.get<OrganizationUserController>(
			OrganizationUserController,
		);

		spyService = module.get<OrganizationUserService>(OrganizationUserService);
	});

	//Get on ROOT
	describe('Receiving a GET requests on organization/:organizationId/users with NO PARAMS', () => {
		describe('with an authorized JWT', () => {
			it('Should call findAll on the OrganizationUser Service.', async () => {
				const findAllSpy = jest.spyOn(spyService, 'findAll');

				await controller.findAll(mockOrganization._id.toHexString(), {
					user: mockUserToken,
				});
				await controller.findAll(mockOrganization._id.toHexString(), {
					user: mockAdminToken,
				});
				await controller.findAll(mockOrganization._id.toHexString(), {
					user: mockNonAuthUserToken,
				});

				//should be called twice
				expect(findAllSpy).toBeCalledTimes(3);
			});
		});
	});

	//receiving a POST
	describe('Receiving a POST request on organization/:organizationId/users', () => {
		describe('With an authorized JWT', () => {
			it('Should call create on the OrganizationUser Service.', async () => {
				const createSpy = jest.spyOn(spyService, 'create');

				await controller.create(
					mockOrganization._id.toHexString(),
					{ userEmail: mockUserToken.email },
					{
						user: mockUserToken,
					},
				);
				await controller.create(
					mockOrganization._id.toHexString(),
					{ userEmail: mockUserToken.email },
					{
						user: mockAdminToken,
					},
				);
				await controller.create(
					mockOrganization._id.toHexString(),
					{ userEmail: mockUserToken.email },
					{
						user: mockNonAuthUserToken,
					},
				);

				expect(createSpy).toBeCalledTimes(3);
			});
		});
	});

	//when deleting an org
	describe('When calling DELETE on organization/:organizationId/users/:userId', () => {
		describe('With an authorized JWT', () => {
			it('Should call the remove function of the OrganizationUser Service', async () => {
				const deleteSpy = jest.spyOn(spyService, 'remove');

				await controller.remove(
					mockOrganization._id.toHexString(),
					mockNonAuthUserToken._id.toHexString(),
					{
						user: mockUserToken,
					},
				);
				await controller.remove(
					mockOrganization._id.toHexString(),
					mockNonAuthUserToken._id.toHexString(),
					{
						user: mockAdminToken,
					},
				);
				await controller.remove(
					mockOrganization._id.toHexString(),
					mockNonAuthUserToken._id.toHexString(),
					{
						user: mockNonAuthUserToken,
					},
				);

				expect(deleteSpy).toBeCalledTimes(3);
			});
		});
	});
});
