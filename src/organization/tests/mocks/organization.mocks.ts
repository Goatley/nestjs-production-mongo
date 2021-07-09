import { Types } from 'mongoose';
import { IUserToken } from 'src/user/interfaces/user.interface';

const mockOrgId = Types.ObjectId();
const mockUserId = Types.ObjectId();
const mockAdminId = Types.ObjectId();
const mockNonAuthUserId = Types.ObjectId();

export const mockOrganization = {
	_id: mockOrgId,
	name: 'Mocked Organization',
	description: 'Mock organization for testing',
	users: [mockUserId, mockAdminId],
	admins: [mockAdminId],
	projects: [Types.ObjectId()],
};

export const mockUserToken: IUserToken = {
	_id: mockUserId,
	email: 'test@test.com',
	permissions: [],
};

export const mockUser = {
	_id: mockUserId,
	email: 'test@test.com',
	organizations: [mockOrgId],
};

export const mockAdminToken: IUserToken = {
	_id: mockAdminId,
	email: 'test@test.com',
	permissions: [],
};

export const mockAdmin = {
	_id: mockAdminId,
	email: 'test@test.com',
	organizations: [mockOrgId],
};

export const mockNonAuthUserToken: IUserToken = {
	_id: mockNonAuthUserId,
	email: 'nonAuth@test.com',
	permissions: [],
};

export const mockNonAuthUser = {
	_id: mockNonAuthUserId,
	email: 'nonAuth@test.com',
	organizations: [],
};

export const mockNonAuthUser2 = {
	_id: Types.ObjectId(),
	email: 'test@test.com',
	organizations: [],
};

export const mockNonAuthUser3 = {
	_id: Types.ObjectId(),
	email: 'test@test.com',
	organizations: [],
};
