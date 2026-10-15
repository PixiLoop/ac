import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';

@Controller('inventory/categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Permissions('inventory.view')
  list(
    @Query('search') search?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.service.list({ search, skip: Number(skip), take: Number(take), sortKey, sortDir });
  }

  @Get(':id')
  @Permissions('inventory.view')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('inventory.create')
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('inventory.edit')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('inventory.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
