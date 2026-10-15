import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationsDto, UpdateOrganizationsDto } from './dto/organizations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  @Permissions('organizations.view')
  list(@Query('activeOnly') activeOnly?: string) {
    return this.service.list(activeOnly);
  }

  @Post()
  @Permissions('organizations.create')
  create(@Body() dto: CreateOrganizationsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('organizations.edit')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('organizations.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}