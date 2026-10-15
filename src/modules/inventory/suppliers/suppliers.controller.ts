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

import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';

@Controller('inventory/suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @Permissions('suppliers.view')
  async list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.service.list({
      search,
      status,
      skip: Number(skip),
      take: Number(take),
      sortKey,
      sortDir,
    });
  }

  @Get(':id')
  @Permissions('suppliers.view')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('suppliers.create')
  async create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('suppliers.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('suppliers.delete')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
