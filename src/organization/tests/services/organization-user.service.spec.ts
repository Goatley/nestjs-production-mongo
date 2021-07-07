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

	describe('When calling Update on OrganizationUser service ', () => {
		describe('With an organizationId that doesn"t exist', () => {
			it('Should throw a DocumentNotFoundError', async () => {
				await expect(
					orgUserService.update(
						Types.ObjectId().toHexString(), //random ID,
						{ users: [mockNonAuthUserToken._id.toHexString()] },
						mockAdminToken,
					),
				).rejects.toThrow(mongooseError.DocumentNotFoundError);
			});
		});

		describe('With a non-authenticated user', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgUserService.update(
						mockOrganization._id.toHexString(),
						{ users: [mockUserToken._id.toHexString()] },
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated User but NOT admin', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgUserService.update(
						mockOrganization._id.toHexString(),
						{ users: [mockNonAuthUserToken._id.toHexString()] },
						mockUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated ADMIN', () => {
			describe('With a single user being added', () => {
				it('Should update the organization with the new user, send out an OrganizationUserUpdated event, and add the organization to the added user"s organizations', async () => {
					expect.assertions(3);

					//listen for the updated event
					//there may be multiple, as a new event is sent for each user
					//here there will only be one as we're just adding one new user
					orgEmitter.on(OrganizationEvents.userUpdated, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								updatedUser: expect.objectContaining({ _id: mockNonAuthUserToken._id }),
							}),
						);
					});

					const result = await orgUserService.update(
						mockOrganization._id.toHexString(),
						{ users: [mockNonAuthUserToken._id.toHexString()] },
						mockAdminToken,
					);

					expect(result).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							users: expect.arrayContaining([
								expect.objectContaining({
									_id: mockAdminToken._id,
									email: mockAdminToken.email,
								}),
								expect.objectContaining({
									_id: mockNonAuthUserToken._id,
									email: mockNonAuthUserToken.email,
								}),
							]),
						}),
					);

					//now let's make sure the org was added to our updated user's org list
					const updatedUser = await userModel.findOne({
						_id: mockNonAuthUserToken._id,
					});

					expect(updatedUser).toEqual(
						expect.objectContaining({
							organizations: expect.arrayContaining([mockOrganization._id]),
						}),
					);
				});
			});

			describe('With multiple users being added', () => {
				it('Should do stuff', async () => {
					expect.assertions(5);

					//helper function for THIS TEST ONLY to determine which ID to test against for new users added
					const determineTestID = (payload) => {
						if (
							payload.updatedUser._id.toHexString() ===
							mockNonAuthUser2._id.toHexString()
						) {
							return mockNonAuthUser2._id;
						} else {
							return mockNonAuthUser3._id;
						}
					};

					//setup orgEmitter listener for events
					orgEmitter.on(OrganizationEvents.userUpdated, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdmin._id }),
								updatedUser: expect.objectContaining({
									_id: determineTestID(payload),
								}),
							}),
						);
					});

					const result = await orgUserService.update(
						mockOrganization._id.toHexString(),
						{
							users: [
								mockNonAuthUser2._id.toHexString(),
								mockNonAuthUser3._id.toHexString(),
							],
						},
						mockAdminToken,
					);

					expect(result).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							users: expect.arrayContaining([
								expect.objectContaining({ _id: mockNonAuthUser2._id }),
								expect.objectContaining({ _id: mockNonAuthUser3._id }),
							]),
						}),
					);

					//now let's check each user to make sure they both have the added organizations
					await expect(
						userModel.findOne({ _id: mockNonAuthUser2._id }),
					).resolves.toEqual(
						expect.objectContaining({
							organizations: expect.arrayContaining([mockOrganization._id]),
						}),
					);

					//check for second added user
					await expect(
						userModel.findOne({ _id: mockNonAuthUser3._id }),
					).resolves.toEqual(
						expect.objectContaining({
							organizations: expect.arrayContaining([mockOrganization._id]),
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
