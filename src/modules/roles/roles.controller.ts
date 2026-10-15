import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles.view')
  async list(
    @Query('search') search?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take = 20,
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query() query?: Record<string, any>,
  ) {
    // extract filters: filter_name, filter_description etc
    const filters: Record<string, string> = {};
    Object.keys(query || {}).forEach((k) => {
      if (k.startsWith('filter_') && query[k]) {
        filters[k.replace('filter_', '')] = query[k];
      }
    });

    return this.rolesService.findAll({
      search,
      skip,
      take,
      sortKey,
      sortDir,
      filters,
    });
}


  @Get('permissions')
  @Permissions('roles.view')
  async listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get(':id')
  @Permissions('roles.view')
  async get(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('roles.create')
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @Permissions('roles.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @Permissions('roles.manageSecurity')
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.rolesService.setPermissions(id, dto.permissionIds ?? []);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Permissions('roles.delete')
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}
