import {
	Controller,
	Get,
	Body,
	Patch,
	Param,
	Delete,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationUserService } from '../services/organization-user.service';
import { UpdateOrganizationUsersDto } from '../dto/update-organization-users.dto';
import {
	ApiAcceptedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { UserListDto } from '../dto/user-list.dto';

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

	@Patch()
	@ApiAcceptedResponse({ type: UserListDto })
	@ApiForbiddenResponse()
	async update(
		@Param('organizationId') organizationId: string,
		@Body() updateOrganizationUsersDto: UpdateOrganizationUsersDto,
		@Req() req,
	) {
		return await this.organizationUserService.update(
			organizationId,
			updateOrganizationUsersDto,
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
