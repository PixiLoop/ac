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

import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('quotations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Get()
  @Permissions('quotations.view')
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions('quotations.view')
  async find(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Permissions('quotations.create')
  async create(@Body() dto: CreateQuotationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('quotations.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    console.log('UPDATE DTO:', JSON.stringify(dto, null, 2));
    return this.service.update(id, dto);
  }

  @Patch(':id/groups/:groupType/items')
  @Permissions('quotations.edit')
  async updateGroupItems(
    @Param('id') id: string,
    @Param('groupType') groupType: string,
    @Body() dto: UpdateQuotationItemsDto,
  ) {
    console.log('DTO RECEIVED:', dto);
    return this.service.updateGroupItems(id, groupType, dto);
  }

  @Delete(':id')
  @Permissions('quotations.delete')
  async remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}