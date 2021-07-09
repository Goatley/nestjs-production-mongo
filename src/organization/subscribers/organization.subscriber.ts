import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { OrganizationEvents } from '../events/organization.events';
import { IOrganizationEvent } from '../interfaces/organization.interface';

@Injectable()
export class OrganizationEventSubscriber {
	constructor(private readonly logger: Logger) {}

	@OnEvent(OrganizationEvents.created)
	handleOrgCreatedEvent(payload: IOrganizationEvent) {
		this.logger.log(
			`Time to send out our emails for this new organization that was created!`,
		);
	}

	@OnEvent(OrganizationEvents.updated)
	handleOrgUpdatedEvent(payload: IOrganizationEvent) {
		this.logger.log(
			'Lets handle anything we need to do with the organization being updated (probably nothing though...)',
		);
	}

	@OnEvent(OrganizationEvents.deleted)
	handleOrgDeletedEvent(payload: IOrganizationEvent) {
		this.logger.log(
			'Lets send out an email notifying the admins that the organization has been archived',
		);
	}
}
