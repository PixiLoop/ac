import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PickingSlipsService } from './picking-slips.service';
import {
    CreatePickingSlipDto,
    UpdatePickingSlipDto,
    UpdatePickingSlipLinesDto,
    ListPickingSlipsDto,
} from './dto/picking-slip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('picking-slips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PickingSlipsController {
    constructor(private readonly service: PickingSlipsService) { }

    @Get()
    @Permissions('picking-slips.view')
    async list(@Query() dto: ListPickingSlipsDto) {
        return this.service.list(dto);
    }

    // STATIC routes before :id
    @Get('by-sales-order/:salesOrderId')
    @Permissions('picking-slips.view')
    async getBySalesOrder(@Param('salesOrderId') salesOrderId: string) {
        return this.service.getBySalesOrder(salesOrderId);
    }

    @Post('from-salesorder')
    @Permissions('picking-slips.create')
    async createFromSalesOrder(@Body() dto: CreatePickingSlipDto) {
        return this.service.createFromSalesOrder(dto);
    }

    // Dynamic warehouse-wide picking list — not persisted
    @Get('generate')
    @Permissions('picking-slips.view')
    async generate(
        @Query('customerIds') customerIds?: string,
        @Query('salesOrderIds') salesOrderIds?: string,
        @Query('includeOnSite') includeOnSite?: string,
    ) {
        return this.service.generate({ customerIds, salesOrderIds, includeOnSite });
    }

    // DYNAMIC :id routes after
    @Get(':id')
    @Permissions('picking-slips.view')
    async find(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Patch(':id')
    @Permissions('picking-slips.edit')
    async update(@Param('id') id: string, @Body() dto: UpdatePickingSlipDto) {
        return this.service.update(id, dto);
    }

    @Patch(':id/lines')
    @Permissions('picking-slips.edit')
    async updateLines(@Param('id') id: string, @Body() dto: UpdatePickingSlipLinesDto) {
        return this.service.updateLines(id, dto);
    }

    @Post(':id/complete')
    @Permissions('picking-slips.edit')
    async complete(@Param('id') id: string) {
        return this.service.complete(id);
    }

    @Delete(':id')
    @Permissions('picking-slips.delete')
    async remove(@Param('id') id: string) {
        return this.service.softDelete(id);
    }
}