import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { OrganizationEvents } from '../events/organization.events';
import {
	IOrganizationUserAddedEvent,
	IOrganizationUserCreatedEvent,
	IOrganizationUserDeletedEvent,
} from '../interfaces/organization.interface';

@Injectable()
export class OrganizationUserEventSubscriber {
	constructor(private readonly logger: Logger) {}

	@OnEvent(OrganizationEvents.userCreated)
	handleUserCreatedEvent(payload: IOrganizationUserCreatedEvent) {
		this.logger.log(
			'Better handle any events for newly created user and send out our invite email!',
		);
	}

	@OnEvent(OrganizationEvents.userAdded)
	handleUserAddedEvent(payload: IOrganizationUserAddedEvent) {
		this.logger.log(
			'Handle our event to notify the user that they have been added to an organization here',
		);
	}

	@OnEvent(OrganizationEvents.userDeleted)
	handleUserDeletedEvent(payload: IOrganizationUserDeletedEvent) {
		this.logger.log(
			'A user got removed from the organization - lets do anything we need to do here',
		);
	}
}
