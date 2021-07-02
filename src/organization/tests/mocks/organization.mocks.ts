import { Types } from 'mongoose';
import { mockUserId, mockAdminId } from './users.mocks';

export const mockOrgId = Types.ObjectId();

export const mockOrganization = {
	_id: mockOrgId,
	name: 'Mocked Organization',
	description: 'Mock organization for testing',
	users: [mockUserId, mockAdminId],
	admins: [mockAdminId],
};
