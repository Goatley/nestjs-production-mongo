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
import { Model, Types } from 'mongoose';
import {
	mockOrganization,
	mockUser,
	mockUserToken,
	mockAdmin,
	mockAdminToken,
	mockNonAuthUser,
	mockNonAuthUserToken,
} from '../mocks/organization.mocks';
import {
	InsufficientPermissionError,
	ActionNotAllowedError,
} from '../../../errors/errors';
import { organizationProviders } from '../../organization.providers';
import { userProviders } from '../../../user/user.providers';
import { Error as mongooseError } from 'mongoose';
import { OrganizationEvents } from '../../events/organization.events';

describe('OrganizationService', () => {
	let orgService: OrganizationService;
	let orgEmitter: EventEmitter2;

	let orgModel: Model<IOrganization>;
	let userModel: Model<IUser>;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [TestDatabaseModule],
			providers: [
				{
					provide: EventEmitter2,
					useValue: new EventEmitter2(),
				},
				OrganizationService,
				OrganizationPermissions,
				Logger,
				...organizationProviders,
				...userProviders,
			],
		}).compile();

		orgService = module.get<OrganizationService>(OrganizationService);
		orgEmitter = module.get<EventEmitter2>(EventEmitter2);

		orgModel = module.get(InjectedConstants.organization_model);
		userModel = module.get(InjectedConstants.user_model);

		//let's add in our fake org
		await orgModel.create(mockOrganization);

		//let's add fake users
		await userModel.create(mockUser);
		await userModel.create(mockAdmin);
		await userModel.create(mockNonAuthUser);
	});

	describe('When calling findAll (GET) on organization service', () => {
		describe('With a user who has organizations', () => {
			it('Should return an Array of the organizations the user is a part of', async () => {
				await expect(orgService.findAll(mockUserToken)).resolves.toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							_id: mockOrganization._id,
							name: mockOrganization.name,
							description: mockOrganization.description,
							admins: expect.arrayContaining(mockOrganization.admins),
							users: expect.arrayContaining(mockOrganization.users),
						}),
					]),
				);
			});
		});

		describe('With user with no organizations', () => {
			it('Should return with an empty array', async () => {
				await expect(orgService.findAll(mockNonAuthUserToken)).resolves.toEqual([]);
			});
		});
	});

	describe('When calling findOne (GET) on organization service with a provided organizationId', () => {
		describe('With a user authorized to that organization', () => {
			it('Should return the organization requested', async () => {
				await expect(
					orgService.findOne(mockOrganization._id.toHexString(), mockUserToken),
				).resolves.toEqual(
					expect.objectContaining({
						_id: mockOrganization._id,
						name: mockOrganization.name,
						description: mockOrganization.description,
						users: expect.arrayContaining(mockOrganization.users),
						admins: expect.arrayContaining(mockOrganization.admins),
					}),
				);
			});
		});

		describe('With a user who is NOT authorized to that organization', () => {
			it('Should throw an InsufficientPermissionsError back', async () => {
				await expect(
					orgService.findOne(
						mockOrganization._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});
	});

	describe('When calling create (POST) on organization service with an OrganizationService DTO', () => {
		it('Should create a new organization with the user listed as an admin and user, and created by/updated by being the user, and release an OrganizationCreated event', async () => {
			expect.assertions(3);

			//let's make sure our org created event is sent out
			orgEmitter.on(OrganizationEvents.created, (payload) => {
				expect(payload).toEqual(
					expect.objectContaining({
						organization: expect.objectContaining({
							name: 'test creating org',
							description: '',
							createdBy: mockUser._id,
						}),
						user: mockUserToken,
					}),
				);
			});

			const orgCreated = await orgService.create(
				{ name: 'test creating org', description: '' },
				mockUserToken,
			);

			//test to make sure the org was created
			expect(orgCreated).toEqual(
				expect.objectContaining({
					name: 'test creating org',
					description: '',
					users: expect.arrayContaining([mockUserToken._id]),
					admins: expect.arrayContaining([mockUserToken._id]),
					updatedBy: mockUserToken._id,
					createdBy: mockUserToken._id,
				}),
			);

			//now let's make sure our user has the new org listed for them
			await expect(userModel.findById(mockUserToken._id)).resolves.toEqual(
				expect.objectContaining({
					organizations: expect.arrayContaining([orgCreated._id]),
				}),
			);
		});
	});

	describe('When calling update (PATCH) on organization service', () => {
		describe('As an authorized ADMIN for the organization', () => {
			it('Should update the organization and return the new Org, the updatedBy should be the user who updated, and an OrgUpdated event should be fired', async () => {
				expect.assertions(2);

				//let's register a listener for update event
				orgEmitter.on(OrganizationEvents.updated, (payload) => {
					expect(payload).toEqual(
						expect.objectContaining({
							organization: expect.objectContaining({
								name: 'updated test org',
								description: '',
								updatedBy: mockAdminToken._id,
							}),
							user: mockAdminToken,
						}),
					);
				});

				const updatedOrg = await orgService.update(
					mockOrganization._id.toHexString(),
					{ name: 'updated test org', description: '' },
					mockAdminToken,
				);

				expect(updatedOrg).toEqual(
					expect.objectContaining({
						_id: mockOrganization._id,
						name: 'updated test org',
						description: '',
						users: expect.arrayContaining(mockOrganization.users),
						admins: expect.arrayContaining(mockOrganization.admins),
						updatedBy: mockAdminToken._id,
					}),
				);
			});

			it('Should throw a DocumentNotFoundError on an org that does not exist', async () => {
				await expect(
					orgService.update(
						Types.ObjectId().toHexString(),
						{ name: 'test updating again' },
						mockAdminToken,
					),
				).rejects.toThrow(mongooseError.DocumentNotFoundError);
			});
		});

		describe('As an authorized USER for the organization', () => {
			it('Should reject the request and return an insufficient permissions error', async () => {
				await expect(
					orgService.update(
						mockOrganization._id.toHexString(),
						{ name: 'testing update with user' },
						mockUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});

			describe('As a NON-authorized USER for the organization', () => {
				it('Should reject the request and return an insufficient permissions error', async () => {
					await expect(
						orgService.update(
							mockOrganization._id.toHexString(),
							{ name: 'testing update with user' },
							mockNonAuthUserToken,
						),
					).rejects.toThrow(InsufficientPermissionError);
				});
			});
		});
	});

	describe('When calling remove (DELETE) on organization service', () => {
		describe('with a nonauthorized user account', () => {
			it('Should reject with an insufficient permissions error', async () => {
				await expect(
					orgService.remove(
						mockOrganization._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('with an autherized USER account', () => {
			it('Should reject with an InsufficientPermissionError', async () => {
				await expect(
					orgService.remove(mockOrganization._id.toHexString(), mockUserToken),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authorized ADMIN account', () => {
			describe('Without a valid (nonexisting) OrganizationId', () => {
				it('Should throw a DocumentNotFoundError', async () => {
					await expect(
						orgService.remove(Types.ObjectId().toHexString(), mockAdminToken),
					).rejects.toThrow(mongooseError.DocumentNotFoundError);
				});
			});

			describe('With a valid organizationID but when there are PROJECTS belonging to the org', () => {
				it('Should throw an ActionNotAllowedError', async () => {
					await expect(
						orgService.remove(mockOrganization._id.toHexString(), mockAdminToken),
					).rejects.toThrow(ActionNotAllowedError);
				});
			});

			describe('With a VALID organizationId, which has NO projects', () => {
				it('Should delete the organization, and send out the Org Deleted event', async () => {
					expect.assertions(3);

					//first, let's remove any projects
					await orgModel.findOneAndUpdate(
						{ _id: mockOrganization._id },
						{ projects: [] },
					);

					orgEmitter.on(OrganizationEvents.deleted, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({
									_id: mockOrganization._id,
								}),
								user: mockAdminToken,
							}),
						);
					});

					//run the function
					const deletedOrg = await orgService.remove(
						mockOrganization._id.toHexString(),
						mockAdminToken,
					);

					expect(deletedOrg).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
						}),
					);

					//now let's query the DB to make sure it doesn't exist anymore
					await expect(
						orgService.findOne(mockOrganization._id.toHexString(), mockAdminToken),
					).rejects.toThrow(mongooseError.DocumentNotFoundError);
				});
			});
		});
	});

	afterAll(async () => {
		await closeInMongodConnection();
	});
});
