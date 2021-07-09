import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../../../test/mongooseTestDb/testDatabase.module';
import { closeInMongodConnection } from '../../../../test/mongooseTestDb/testDatabase.providers';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationPermissions } from '../../permissions/organization.permissions';
import { IOrganization } from '../../interfaces/organization.interface';
import { OrganizationUserService } from '../../services/organization-user.service';
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
	mockNonAuthUser2,
	mockNonAuthUser3,
} from '../mocks/organization.mocks';
import {
	InsufficientPermissionError,
	ActionNotAllowedError,
} from '../../../errors/errors';
import { organizationProviders } from '../../organization.providers';
import { userProviders } from '../../../user/user.providers';
import { Error as mongooseError } from 'mongoose';
import { OrganizationEvents } from '../../events/organization.events';

describe('OrganizationUserService', () => {
	let orgUserService: OrganizationUserService;
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
				OrganizationUserService,
				OrganizationPermissions,
				Logger,
				...organizationProviders,
				...userProviders,
			],
		}).compile();

		orgUserService = module.get<OrganizationUserService>(OrganizationUserService);
		orgEmitter = module.get<EventEmitter2>(EventEmitter2);

		orgModel = module.get(InjectedConstants.organization_model);
		userModel = module.get(InjectedConstants.user_model);

		//let's add in our fake org
		await orgModel.create(mockOrganization);

		//adding in more users to test multi-user add and multi-user delete

		//let's add fake users
		await userModel.create(mockUser);
		await userModel.create(mockAdmin);
		await userModel.create(mockNonAuthUser);
		await userModel.create(mockNonAuthUser2);
		await userModel.create(mockNonAuthUser3);
	});

	describe('When calling findAll on OrganizationUser service ', () => {
		describe('With an organizationId that doesn"t exist', () => {
			it('Should throw a DocumentNotFoundError', async () => {
				await expect(
					orgUserService.findAll(
						Types.ObjectId().toHexString(), //random ID,
						mockAdminToken,
					),
				).rejects.toThrow(mongooseError.DocumentNotFoundError);
			});
		});

		describe('With a non-authenticated user', () => {
			it('Should reject the reqeust with an InsufficientPermissionsError', async () => {
				await expect(
					orgUserService.findAll(
						mockOrganization._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated user', () => {
			it('Should return a list of users belonging to an organization', async () => {
				const result = await orgUserService.findAll(
					mockOrganization._id.toHexString(),
					mockUserToken,
				);

				expect(result).toEqual(
					expect.objectContaining({
						_id: mockOrganization._id,
						users: expect.arrayContaining([
							expect.objectContaining({
								_id: mockUser._id,
								email: mockUser.email,
							}),
							expect.objectContaining({
								_id: mockAdmin._id,
								email: mockAdmin.email,
							}),
						]),
					}),
				);
			});
		});
	});

	describe('When calling create on OrganizationUser Service', () => {
		describe('When calling with a non-authenticated user', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgUserService.create(
						mockOrganization._id.toHexString(),
						{ userEmail: 'test@test.com' },
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('When calling with an authed user but non-admin', () => {
			it('Should reject with an InsufficientPermissinosError', async () => {
				await expect(
					orgUserService.create(
						mockOrganization._id.toHexString(),
						{ userEmail: 'test@test.com' },
						mockUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('When calling with an ADMIN of the organization', () => {
			describe('On an existing user', () => {
				it('Should add the organization to the users organization list, add the user to the organization, and send off the organizationUserAdded event', async () => {
					expect.assertions(3);

					//setup event listener
					orgEmitter.on(OrganizationEvents.userAdded, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								addedUser: expect.objectContaining({
									_id: mockNonAuthUser._id,
									organizations: expect.arrayContaining([mockOrganization._id]),
								}),
							}),
						);
					});

					const result = await orgUserService.create(
						mockOrganization._id.toHexString(),
						{ userEmail: 'nonAuth@test.com' },
						mockAdminToken,
					);

					//get the user back, make sure teh org is a part of their organizations
					expect(result).toEqual(
						expect.objectContaining({
							_id: mockNonAuthUser._id,
							organizations: expect.arrayContaining([mockOrganization._id]),
						}),
					);

					//make sure the user is in the org list too
					await expect(
						orgModel.findOne({ _id: mockOrganization._id }),
					).resolves.toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							users: expect.arrayContaining([mockNonAuthUser._id]),
						}),
					);
				});
			});

			describe('On a completely new user (by email)', () => {
				it('Should create the user, add the user to the org, add the org to the user, and send out an organizationUserCreated event', async () => {
					expect.assertions(3);

					orgEmitter.on(OrganizationEvents.userCreated, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								createdUser: expect.objectContaining({
									email: 'newUser@test.com',
									organizations: expect.arrayContaining([mockOrganization._id]),
								}),
							}),
						);
					});

					const result = await orgUserService.create(
						mockOrganization._id.toHexString(),
						{ userEmail: 'newUser@test.com' },
						mockAdminToken,
					);

					//expect the user to be created and sent back with that org as an org
					expect(result).toEqual(
						expect.objectContaining({
							email: 'newUser@test.com',
							organizations: expect.arrayContaining([mockOrganization._id]),
						}),
					);

					//expect the mock org to have this user now
					await expect(
						orgModel.findOne({ _id: mockOrganization._id }),
					).resolves.toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							users: expect.arrayContaining([result._id]),
						}),
					);
				});
			});
		});
	});

	describe('When calling Remove on OrganizationUser service', () => {
		describe('With a non-authorized user', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				//first, let's make sure we have our original user NOT authorized/remove them from the org (added in prev test)
				await orgUserService.remove(
					mockOrganization._id.toHexString(),
					mockNonAuthUser._id.toHexString(),
					mockAdminToken,
				);

				await expect(
					orgUserService.remove(
						mockOrganization._id.toHexString(),
						mockNonAuthUser._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an Authorized User, but non-admin', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgUserService.remove(
						mockOrganization._id.toHexString(),
						mockUserToken._id.toHexString(),
						mockUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authorized ADMIN of the organization', () => {
			describe('With an OrganizationId that DOESN"T exist', () => {
				it('Should reject and throw a DocumentNotFound error', async () => {
					await expect(
						orgUserService.remove(
							Types.ObjectId().toHexString(),
							mockUserToken._id.toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(mongooseError.DocumentNotFoundError);
				});
			});

			describe('With a userId that doesn"t exist', () => {
				it('Should reject with a DocumentNotFoundError', async () => {
					await expect(
						orgUserService.remove(
							mockOrganization._id.toHexString(),
							Types.ObjectId().toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(mongooseError.DocumentNotFoundError);
				});
			});

			describe('While trying to remove a user who is also an Admin', () => {
				it('Should reject with an ActionNotAllowedError', async () => {
					await expect(
						orgUserService.remove(
							mockOrganization._id.toHexString(),
							mockAdminToken._id.toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(ActionNotAllowedError);
				});
			});

			describe('With a valid organizationId and a regular UserId as the target to delete', () => {
				it('Should update the organization"s user list to not include the user anymore, send out the UserDeletedEvent, and remove the organization from the deleted users"s org list', async () => {
					expect.assertions(3);

					//check for user deleted event payload to be correct
					orgEmitter.on(OrganizationEvents.userDeleted, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								deletedUser: expect.objectContaining({ _id: mockUserToken._id }),
							}),
						);
					});

					const response = await orgUserService.remove(
						mockOrganization._id.toHexString(),
						mockUserToken._id.toHexString(),
						mockAdminToken,
					);

					expect(response).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							users: expect.not.arrayContaining([
								expect.objectContaining({
									_id: mockUserToken._id,
								}),
							]),
						}),
					);

					await expect(
						userModel.findOne({ _id: mockUserToken._id }),
					).resolves.toEqual(
						expect.objectContaining({
							organizations: expect.not.arrayContaining([mockOrganization._id]),
						}),
					);
				});
			});
		});
	});

	afterEach(async () => {
		orgEmitter.removeAllListeners();
	});

	afterAll(async () => {
		await closeInMongodConnection();
	});
});
