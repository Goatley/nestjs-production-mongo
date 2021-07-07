import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseModule } from '../../../../test/mongooseTestDb/testDatabase.module';
import { closeInMongodConnection } from '../../../../test/mongooseTestDb/testDatabase.providers';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationPermissions } from '../../permissions/organization.permissions';
import { IOrganization } from '../../interfaces/organization.interface';
import { OrganizationAdminService } from '../../services/organization-admin.service';
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

describe('OrganizationAdminService', () => {
	let orgAdminService: OrganizationAdminService;
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
				OrganizationAdminService,
				OrganizationPermissions,
				Logger,
				...organizationProviders,
				...userProviders,
			],
		}).compile();

		orgAdminService = module.get<OrganizationAdminService>(
			OrganizationAdminService,
		);
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

	describe('When calling findAll on OrganizationAdmin service ', () => {
		describe('With an organizationId that doesn"t exist', () => {
			it('Should throw a DocumentNotFoundError', async () => {
				await expect(
					orgAdminService.findAll(
						Types.ObjectId().toHexString(), //random ID,
						mockAdminToken,
					),
				).rejects.toThrow(mongooseError.DocumentNotFoundError);
			});
		});

		describe('With a non-authenticated user', () => {
			it('Should reject the reqeust with an InsufficientPermissionsError', async () => {
				await expect(
					orgAdminService.findAll(
						mockOrganization._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated user', () => {
			it('Should return a list of users belonging to an organization', async () => {
				const result = await orgAdminService.findAll(
					mockOrganization._id.toHexString(),
					mockUserToken,
				);

				expect(result).toEqual(
					expect.objectContaining({
						_id: mockOrganization._id,
						admins: expect.arrayContaining([
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

	describe('When calling Update on OrganizationAdmin service ', () => {
		describe('With an organizationId that doesn"t exist', () => {
			it('Should throw a DocumentNotFoundError', async () => {
				await expect(
					orgAdminService.update(
						Types.ObjectId().toHexString(), //random ID,
						{ adminId: mockNonAuthUserToken._id.toHexString() },
						mockAdminToken,
					),
				).rejects.toThrow(mongooseError.DocumentNotFoundError);
			});
		});

		describe('With a non-authenticated user', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgAdminService.update(
						mockOrganization._id.toHexString(),
						{ adminId: mockUserToken._id.toHexString() },
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated User but NOT admin', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				await expect(
					orgAdminService.update(
						mockOrganization._id.toHexString(),
						{ adminId: mockNonAuthUserToken._id.toHexString() },
						mockUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an authenticated ADMIN', () => {
			describe('While trying to add an admin who is ALREADY an admin', () => {
				it('Should reject with an ActionNotAllowedError', async () => {
					await expect(
						orgAdminService.update(
							mockOrganization._id.toHexString(),
							{ adminId: mockAdminToken._id.toHexString() },
							mockAdminToken,
						),
					).rejects.toThrow(ActionNotAllowedError);
				});
			});

			describe('With a single admin being added who was not a previous user', () => {
				it('Should update the organization with the new admin, send out an OrganizationAdminUpdated event, and add the organization to the added user"s organizations', async () => {
					expect.assertions(3);

					//listen for the updated event
					//there may be multiple, as a new event is sent for each user
					//here there will only be one as we're just adding one new user
					orgEmitter.on(OrganizationEvents.adminUpdated, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								updatedAdmin: expect.objectContaining({
									_id: mockNonAuthUserToken._id,
								}),
							}),
						);
					});

					const result = await orgAdminService.update(
						mockOrganization._id.toHexString(),
						{ adminId: mockNonAuthUserToken._id.toHexString() },
						mockAdminToken,
					);

					expect(result).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							admins: expect.arrayContaining([
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

			describe('With a single admin being added who is already a user', () => {
				it('Should add the user as an admin, with the org still being listed for them in their model', async () => {
					expect.assertions(3);

					orgEmitter.on(OrganizationEvents.adminUpdated, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								updatedAdmin: expect.objectContaining({
									_id: mockUserToken._id,
								}),
							}),
						);
					});

					const response = await orgAdminService.update(
						mockOrganization._id.toHexString(),
						{ adminId: mockUserToken._id.toHexString() },
						mockAdminToken,
					);

					expect(response).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							admins: expect.arrayContaining([
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
							_id: mockUserToken._id,
							organizations: expect.arrayContaining([
								expect.objectContaining({ _id: mockOrganization._id }),
							]),
						}),
					);
				});
			});
		});
	});

	describe('When calling Remove on OrganizationAdmin service', () => {
		describe('With a non-authorized user', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				//first, let's make sure we have our original user NOT authorized/remove them from the org (added in prev test)
				await orgAdminService.remove(
					mockOrganization._id.toHexString(),
					mockNonAuthUser._id.toHexString(),
					mockAdminToken,
				);

				await expect(
					orgAdminService.remove(
						mockOrganization._id.toHexString(),
						mockNonAuthUser._id.toHexString(),
						mockNonAuthUserToken,
					),
				).rejects.toThrow(InsufficientPermissionError);
			});
		});

		describe('With an Authorized User, but non-admin', () => {
			it('Should reject with an InsufficientPermissionsError', async () => {
				//first lets remove the user as an admin
				await orgAdminService.remove(
					mockOrganization._id.toHexString(),
					mockUserToken._id.toHexString(),
					mockAdminToken,
				);

				await expect(
					orgAdminService.remove(
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
						orgAdminService.remove(
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
						orgAdminService.remove(
							mockOrganization._id.toHexString(),
							Types.ObjectId().toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(mongooseError.DocumentNotFoundError);
				});
			});

			describe('While trying to remove a user who is not an Admin', () => {
				it('Should reject with an ActionNotAllowedError', async () => {
					await expect(
						orgAdminService.remove(
							mockOrganization._id.toHexString(),
							mockNonAuthUserToken._id.toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(ActionNotAllowedError);
				});
			});

			describe('With a valid organizationId and a valid AdminId of an Admin as the target to delete', () => {
				it('Should update the organization"s admin list to not include the user anymore, send out the AdminDeletedEvent, and the user will still be a user of the organization', async () => {
					expect.assertions(4);

					//first, let's add the user as an admin to remove
					await orgAdminService.update(
						mockOrganization._id.toHexString(),
						{ adminId: mockUserToken._id.toHexString() },
						mockAdminToken,
					);

					//check for user deleted event payload to be correct
					orgEmitter.on(OrganizationEvents.adminDeleted, (payload) => {
						expect(payload).toEqual(
							expect.objectContaining({
								organization: expect.objectContaining({ _id: mockOrganization._id }),
								user: expect.objectContaining({ _id: mockAdminToken._id }),
								deletedAdmin: expect.objectContaining({ _id: mockUserToken._id }),
							}),
						);
					});

					const response = await orgAdminService.remove(
						mockOrganization._id.toHexString(),
						mockUserToken._id.toHexString(),
						mockAdminToken,
					);

					expect(response).toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							admins: expect.not.arrayContaining([
								expect.objectContaining({
									_id: mockUserToken._id,
								}),
							]),
						}),
					);

					//make sure the removed admin is still a user of the organization
					await expect(
						userModel.findOne({ _id: mockUserToken._id }),
					).resolves.toEqual(
						expect.objectContaining({
							organizations: expect.arrayContaining([mockOrganization._id]),
						}),
					);

					//now lets make sure the user is still in the organization's user list, but NOT in the admins list
					await expect(
						orgModel.findOne({ _id: mockOrganization._id }),
					).resolves.toEqual(
						expect.objectContaining({
							_id: mockOrganization._id,
							admins: expect.not.arrayContaining([mockUserToken._id]),
							users: expect.arrayContaining([mockUserToken._id]),
						}),
					);
				});
			});

			describe('When trying to delete the final admin on an organization', () => {
				it('Should reject with an ActionNotAllowedError', async () => {
					//lets make our admin the only admin of this org
					await orgModel.findOneAndUpdate(
						{ _id: mockOrganization._id },
						{
							admins: [mockAdminToken._id],
						},
						{ new: true },
					);

					await expect(
						orgAdminService.remove(
							mockOrganization._id.toHexString(),
							mockAdminToken._id.toHexString(),
							mockAdminToken,
						),
					).rejects.toThrow(ActionNotAllowedError);
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
