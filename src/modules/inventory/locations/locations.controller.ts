import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards
} from '@nestjs/common';
import { LocationsService, CreateLocationDto, UpdateLocationDto } from './locations.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';


@Controller('inventory/locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.service.list({
      search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      skip: Number(skip),
      take: Number(take),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}