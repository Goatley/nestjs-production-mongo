import { Types } from 'mongoose';
import { IUserToken } from 'src/user/interfaces/user.interface';
import { mockOrgId } from './organization.mocks';

export const mockUserId = Types.ObjectId();
export const mockAdminId = Types.ObjectId();
export const mockNonAuthUserId = Types.ObjectId();

export const mockUserToken: IUserToken = {
	_id: mockUserId,
	email: 'test@test.com',
	permissions: [],
};

export const mockUser = {
	_id: mockUserId,
	organizations: [mockOrgId],
};

export const mockAdminToken: IUserToken = {
	_id: mockAdminId,
	email: 'test@test.com',
	permissions: [],
};

export const mockAdmin = {
	_id: mockAdminId,
	organizations: [mockOrgId],
};

export const mockNonAuthUserToken: IUserToken = {
	_id: mockNonAuthUserId,
	email: 'test@test.com',
	permissions: [],
};

export const mockNonAuthUser = {
	_id: mockNonAuthUserId,
	organizations: [mockOrgId],
};
