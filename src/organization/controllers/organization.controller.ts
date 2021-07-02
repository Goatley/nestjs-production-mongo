import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import {
	ApiAcceptedResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';

@ApiTags('Organization')
@UseGuards(AuthGuard('jwt'))
@Controller('organization')
export class OrganizationController {
	constructor(private readonly organizationService: OrganizationService) {}

	@Post()
	@ApiCreatedResponse({ type: Object })
	async create(
		@Body() createOrganizationDto: CreateOrganizationDto,
		@Req() req,
	) {
		return await this.organizationService.create(
			createOrganizationDto,
			req['user'],
		);
	}

	@Get()
	@ApiOkResponse({ type: Object })
	findAll(@Req() req) {
		return this.organizationService.findAll(req['user']);
	}

	@Get(':id')
	@ApiOkResponse({ type: Object })
	@ApiForbiddenResponse()
	findOne(@Param('id') id: string, @Req() req) {
		return this.organizationService.findOne(id, req['user']);
	}

	@Patch(':id')
	@ApiAcceptedResponse({ type: Object })
	@ApiForbiddenResponse()
	async update(
		@Param('id') id: string,
		@Body() updateOrganizationDto: UpdateOrganizationDto,
		@Req() req,
	) {
		return await this.organizationService.update(
			id,
			updateOrganizationDto,
			req['user'],
		);
	}

	@Delete(':organizationId')
	@ApiAcceptedResponse({ type: Object })
	@ApiForbiddenResponse()
	remove(@Param('organizationId') id: string, @Req() req) {
		return this.organizationService.remove(id, req['user']);
	}
}
