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
import { OrganizationAdminService } from '../services/organization-admin.service';
import { UpdateOrganizationAdminsDto } from '../dto/update-organization-admins.dto';
import {
	ApiAcceptedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
} from '@nestjs/swagger';
import { UserListDto } from '../dto/user-list.dto';

//CONTROLLER FOR ADMIN MANAGEMENT WITHIN ORGS
@ApiTags('Organization')
@UseGuards(AuthGuard('jwt'))
@Controller('organization/:organizationId/admins')
export class OrganizationAdminController {
	constructor(
		private readonly organizationAdminService: OrganizationAdminService,
	) {}

	@Get()
	@ApiOkResponse({ type: UserListDto })
	@ApiForbiddenResponse()
	findAll(@Param('organizationId') organizationId: string, @Req() req) {
		return this.organizationAdminService.findAll(organizationId, req['user']);
	}

	@Patch()
	@ApiAcceptedResponse({ type: UserListDto })
	@ApiForbiddenResponse()
	async update(
		@Param('organizationId') organizationId: string,
		@Body() updateOrganizationAdminsDto: UpdateOrganizationAdminsDto,
		@Req() req,
	) {
		return await this.organizationAdminService.update(
			organizationId,
			updateOrganizationAdminsDto,
			req['user'],
		);
	}

	@Delete(':adminIdToDelete')
	@ApiAcceptedResponse()
	@ApiForbiddenResponse()
	async remove(
		@Param('organizationId') organizationId: string,
		@Param('adminIdToDelete') adminIdToDelete: string,
		@Req() req,
	) {
		await this.organizationAdminService.remove(
			organizationId,
			adminIdToDelete,
			req['user'],
		);
	}
}
