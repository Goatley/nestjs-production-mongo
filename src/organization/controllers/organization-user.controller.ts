import {
	Controller,
	Get,
	Body,
	Param,
	Delete,
	Req,
	UseGuards,
	Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationUserService } from '../services/organization-user.service';
import {
	ApiAcceptedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { UserListDto } from '../dto/user-list.dto';
import { CreateOrganizationUserDto } from '../dto/create-organization-user.dto';

//CONTROLLER FOR USER MANAGEMENT *WITHIN* ORGS
@ApiTags('Organization')
@UseGuards(AuthGuard('jwt'))
@Controller('organization/:organizationId/users')
export class OrganizationUserController {
	constructor(
		private readonly organizationUserService: OrganizationUserService,
	) {}

	@Get()
	@ApiOkResponse({ type: UserListDto })
	@ApiForbiddenResponse()
	findAll(@Param('organizationId') organizationId: string, @Req() req) {
		return this.organizationUserService.findAll(organizationId, req['user']);
	}

	@Post()
	@ApiAcceptedResponse({ type: UserListDto })
	@ApiForbiddenResponse()
	async create(
		@Param('organizationId') organizationId: string,
		@Body() createOrganizationUserDto: CreateOrganizationUserDto,
		@Req() req,
	) {
		return await this.organizationUserService.create(
			organizationId,
			createOrganizationUserDto,
			req['user'],
		);
	}

	@Delete(':userIdToDelete')
	@ApiAcceptedResponse()
	@ApiForbiddenResponse()
	async remove(
		@Param('organizationId') organizationId: string,
		@Param('userIdToDelete') userIdToDelete: string,
		@Req() req,
	) {
		return await this.organizationUserService.remove(
			organizationId,
			userIdToDelete,
			req['user'],
		);
	}
}
