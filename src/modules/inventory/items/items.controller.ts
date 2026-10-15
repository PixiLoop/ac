import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards
} from '@nestjs/common';

import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';

@Controller('inventory/items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ItemsController {
  constructor(private readonly service: ItemsService) { }

  @Get()
  @Permissions('inventory.view')
  async list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('productCategory') productCategory?: string,
    @Query('productCode') productCode?: string,
    @Query('vendorNumber') vendorNumber?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.service.list({
      search,
      status,
      productCategory,
      productCode,
      vendorNumber,
      skip: Number(skip),
      take: Number(take),
      sortKey,
      sortDir,
    });
  }

  @Get(':id')
  @Permissions('inventory.view')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('inventory.create')
  async create(@Body() dto: CreateItemDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('inventory.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/sales-summary')
  @Permissions('inventory.view')
  async salesSummary(@Param('id') id: string) {
    return this.service.salesSummary(id);
  }

  @Get(':id/sales-history')
  @Permissions('inventory.view')
  async salesHistory(@Param('id') id: string) {
    return this.service.salesHistory(id);
  }

  @Get(':id/back-orders')
  @Permissions('inventory.view')
  async backOrders(@Param('id') id: string) {
    return this.service.backOrders(id);
  }

  @Get(':id/purchase-orders')
  @Permissions('inventory.view')
  async purchaseOrders(@Param('id') id: string) {
    return this.service.purchaseOrders(id);
  }

  @Delete(':id')
  @Permissions('inventory.delete')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
