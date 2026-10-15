import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DispatchMethodsService } from './dispatch-methods.service';
import { CreateDispatchMethodDto, UpdateDispatchMethodDto } from './dto/dispatch-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('dispatch-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DispatchMethodsController {
  constructor(private readonly service: DispatchMethodsService) {}

  @Get()
  @Permissions('dispatchmethods.view')
  list(@Query('activeOnly') activeOnly?: string) {
    return this.service.list(activeOnly);
  }

  @Post()
  @Permissions('dispatchmethods.create')
  create(@Body() dto: CreateDispatchMethodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('dispatchmethods.edit')
  update(@Param('id') id: string, @Body() dto: UpdateDispatchMethodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('dispatchmethods.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}