import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

import { SalesOrdersService } from './salesorders.service';

import { ListSalesOrdersDto } from './dto/list-salesorders.dto';
import { CreateSalesOrderDto } from './dto/create-salesorder.dto';
import { UpdateSalesOrderDto } from './dto/update-salesorder.dto';
import { UpdateSalesOrderItemsDto } from './dto/update-salesorder-items.dto';

@Controller('salesorders')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) { }

  @Get()
  //@Permissions('salesorders.view')
  async list(@Query() dto: ListSalesOrdersDto) {
    return this.salesOrdersService.list(dto);
  }

  @Get(':id')
  @Permissions('salesorders.view')
  async find(@Param('id') id: string) {
    return this.salesOrdersService.findById(id);
  }

  @Post()
  @Permissions('salesorders.create')
  async create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Patch(':id')
  @Permissions('salesorders.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(id, dto);
  }

  @Patch(':id/items')
  @Permissions('salesorders.items.manage')
  async updateItems(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderItemsDto,
  ) {
    return this.salesOrdersService.updateItems(id, dto);
  }

  @Delete(':id')
  @Permissions('salesorders.delete')
  async remove(@Param('id') id: string) {
    return this.salesOrdersService.softDelete(id);
  }
}
