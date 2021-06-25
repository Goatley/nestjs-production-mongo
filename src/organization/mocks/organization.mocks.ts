import { IUserToken } from 'src/user/interfaces/user.interface';
import { Types } from 'mongoose';

const mockedOrgId = Types.ObjectId();
const mockUserId = Types.ObjectId();
const mockAdminId = Types.ObjectId();
const mockNonAuthUserId = Types.ObjectId();

export const mockOrganization = {
	_id: '',
	name: 'Mocked Organization',
	description: 'Mock organization for testing',
	users: [mockUserId, mockAdminId],
	admins: [mockAdminId],
};

export const mockUserToken: IUserToken = {
	_id: mockUserId,
	email: 'test@test.com',
	permissions: [],
};

export const mockUser = {
	_id: mockUserId,
	organizations: [mockedOrgId],
};

export const mockAdminToken: IUserToken = {
	_id: mockAdminId,
	email: 'test@test.com',
	permissions: [],
};

export const mockAdmin = {
	_id: mockAdminId,
	organizations: [mockedOrgId],
};

export const mockNonAuthUserToken: IUserToken = {
	_id: mockNonAuthUserId,
	email: 'test@test.com',
	permissions: [],
};

export const mockNonAuthUser = {
	_id: mockNonAuthUserId,
	organizations: [mockedOrgId],
};
