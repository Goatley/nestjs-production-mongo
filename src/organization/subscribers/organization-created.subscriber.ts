import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { OrganizationEvents } from '../events/organization.events';
import { IOrganizationEvent } from '../interfaces/organization.interface';

@Injectable()
export class OrganizationEventListener {
	constructor(private readonly logger: Logger) {}

	// @OnEvent(OrganizationEvents.created)

	// @onEvent(OrganizationEvents.updated)

	// @OnEvent(OrganizationEvents.deleted)
}
