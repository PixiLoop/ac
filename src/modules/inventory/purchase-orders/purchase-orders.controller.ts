import {
  Controller, Get, Post, Patch,
  Param, Body, Query, Request,
  UseGuards,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/create-po.dto';
import { CreateGrnDto } from './dto/create-grn.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';

@Controller('inventory/purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly svc: PurchaseOrdersService) {}

  @Get()
  @Permissions('purchaseorders.view')
  list(
    @Query('supplierId') supplierId?: string,
    @Query('status')     status?: string,
    @Query('skip')       skip = '0',
    @Query('take')       take = '20',
  ) {
    return this.svc.list({ supplierId, status, skip: +skip, take: +take });
  }

  @Get(':id')
  @Permissions('purchaseorders.view')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  // Supplier's linked products — for pre-filling PO lines
  @Get('supplier/:supplierId/items')
  @Permissions('purchaseorders.view')
  supplierItems(@Param('supplierId') supplierId: string) {
    return this.svc.supplierItems(supplierId);
  }

  @Post()
  @Permissions('purchaseorders.create')
  create(@Body() dto: CreatePurchaseOrderDto, @Request() req: any) {
    return this.svc.create(dto, req.user?.id);
  }

  @Patch(':id')
  @Permissions('purchaseorders.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Request() req: any,
  ) {
    return this.svc.update(id, dto, req.user?.id);
  }

  @Post(':id/submit')
  @Permissions('purchaseorders.edit')
  submit(@Param('id') id: string, @Request() req: any) {
    return this.svc.submit(id, req.user?.id);
  }

  @Post(':id/grn')
  @Permissions('goodsreceipts.create')
  createGrn(
    @Param('id') id: string,
    @Body() dto: CreateGrnDto,
    @Request() req: any,
  ) {
    return this.svc.createGrn(id, dto, req.user?.id);
  }

  @Post(':id/grn/:grnId/commit')
  @Permissions('goodsreceipts.post')
  commitGrn(
    @Param('id')    id: string,
    @Param('grnId') grnId: string,
    @Request()      req: any,
  ) {
    return this.svc.commitGrn(id, grnId, req.user?.id);
  }
}