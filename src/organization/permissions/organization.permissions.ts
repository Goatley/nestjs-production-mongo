import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Action } from '../../permissions/actions';
import { IUserToken } from '../../user/interfaces/user.interface';
import { IOrganizationDocument } from '../interfaces/organization.interface';

@Injectable()
export class OrganizationPermissions {
	checkPermission(
		action: Action,
		organizationDoc: IOrganizationDocument,
		user: IUserToken,
	) {
		//Admins have total control for all actions
		if (organizationDoc.admins.includes(user._id)) return true;

		switch (action) {
			//users can read if they're listed as a user of that org
			case Action.Read:
				if (organizationDoc.users.includes(user._id)) return true;
				return false;
				break;
			//Anyone can create a new org
			//todo may change based on email verification or org limits
			case Action.Create:
				return true;
				break;
			//Users can't update an org - only admins
			case Action.Update:
				return false;
				break;
			case Action.Delete:
				return false;
				break;
			case Action.Manage:
				return false;
				break;
		}
	}
}
