import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express'
import { OrganizationService, OrganizationUserService, OrganizationAdminService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationUsersDto } from './dto/update-organization-users.dto';
import { UpdateOrganizationAdminsDto } from './dto/update-organization-admins.dto';


@UseGuards(AuthGuard('jwt'))
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async create(@Body() createOrganizationDto: CreateOrganizationDto, @Req() req: Request) {
    return await this.organizationService.create(createOrganizationDto, req['user']);
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.organizationService.findAll(req['user']);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.organizationService.findOne(id, req['user']);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto, @Req() req: Request) {
    return await this.organizationService.update(id, updateOrganizationDto, req['user']);
  }

  @Delete(':organizationId')
  remove(@Param('organizationId') id: string, @Req() req: Request) {
    return this.organizationService.remove(id, req['user']);
  }
}

//CONTROLLER FOR USER MANAGEMENT *WITHIN* ORGS
@UseGuards(AuthGuard('jwt'))
@Controller('organization/:organizationId/users')
export class OrganizationUserController {
  constructor(private readonly organizationUserService: OrganizationUserService) {}

  @Get()
  findAll(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.organizationUserService.findAll(organizationId, req['user']);
  }

  @Patch()
  async update(@Param('organizationId') organizationId: string, @Body() updateOrganizationUsersDto: UpdateOrganizationUsersDto, @Req() req: Request) {
    return await this.organizationUserService.update(organizationId, updateOrganizationUsersDto, req['user']);
  }

  @Delete(':userIdToDelete')
  async remove(@Param('organizationId') organizationId: string, @Param('userIdToDelete') userIdToDelete: string, @Req() req: Request) {
    return await this.organizationUserService.remove(organizationId, userIdToDelete, req['user']);
  }
}

//CONTROLLER FOR ADMIN MANAGEMENT WITHIN ORGS
@UseGuards(AuthGuard('jwt'))
@Controller('organization/:organizationId/admins')
export class OrganizationAdminController {
  constructor(private readonly organizationAdminService: OrganizationAdminService) {}

  @Get()
  findAll(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.organizationAdminService.findAll(organizationId, req['user']);
  }

  @Patch()
  async update(@Param('organizationId') organizationId: string, @Body() updateOrganizationAdminsDto: UpdateOrganizationAdminsDto, @Req() req: Request) {
    return await this.organizationAdminService.update(organizationId, updateOrganizationAdminsDto, req['user']);
  }

  @Delete(':adminIdToDelete')
  async remove(@Param('organizationId') organizationId: string, @Param('adminIdToDelete') adminIdToDelete: string, @Req() req: Request) {
    return await this.organizationAdminService.remove(organizationId, adminIdToDelete, req['user']);
  }
}
