import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

export interface ItemListQuery {
  search?: string;
  status?: string;
  productCategory?: string;
  productCode?: string;
  vendorNumber?: string;
  skip?: number;
  take?: number;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

const db = (prisma: PrismaService) => (prisma).product;

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) { }

  async list(query: ItemListQuery = {}) {
    const { search, status, productCategory, productCode, vendorNumber, skip = 0, take = 20, sortKey = 'createdAt', sortDir = 'desc' } = query;

    const where: Record<string, any> = {
      deletedAt: null,
      ...(status && { status }),
      ...(productCategory && { productCategory }),
      ...(productCode && { productCode: { contains: productCode, mode: 'insensitive' } }),
      ...(vendorNumber && { vendorNumber }),
      ...(search && {
        OR: [
          { productCode: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { vendorName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      db(this.prisma).findMany({
        where,
        skip,
        take,
        orderBy: { [sortKey]: sortDir },
        select: {
          id: true,
          productCode: true,
          name: true,
          status: true,
          isActive: true,
          itemType: true,
          orderRank: true,
          vendorName: true,
          vendorNumber: true,
          aircoMarkupGroup: true,
          xGroup: true,
          onHand: true,
          netSupplierBuyPrice: true,
          landedCost: true,
          retailPrice: true,
          tradePrice: true,
          backOrdered: true,
          minStock: true,
          maxStock: true,
          committed: true,
        },
      }),
      db(this.prisma).count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findById(id: string) {
    const item = await db(this.prisma).findFirst({
      where: { id, deletedAt: null },
      include: {
        bogLines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            componentProduct: {
              select: { id: true, productCode: true, name: true },
            },
          },
        },
        InvCategory: true
      },
    });

    if (!item) throw new NotFoundException('Item not found');

    return item;
  }

  async create(dto: CreateItemDto) {
    const existing = await db(this.prisma).findUnique({
      where: { productCode: dto.productCode },
    });

    if (existing) throw new ConflictException(`Product code '${dto.productCode}' already exists`);

    const { bogLines, ...fields } = dto;

    const item = await db(this.prisma).create({
      data: {
        productCode: fields.productCode,
        name: fields.name,
        productCategory: fields.productCategory ?? null,
        extendedDescription: fields.extendedDescription,
        description: fields.description,
        vendorNumber: fields.vendorNumber,
        vendorName: fields.vendorName,
        vendorPartNumber: fields.vendorPartNumber,
        status: fields.status ?? 'Valid Item',
        orderRank: fields.orderRank ?? 'Fixed Stock',
        itemType: fields.itemType ?? 'Item',
        aircoMarkupGroup: fields.aircoMarkupGroup,
        xGroup: fields.xGroup,
        isActive: fields.isActive ?? true,
        billOfGoods: fields.billOfGoods ?? false,
        replacedBy: fields.replacedBy,
        onHand: fields.onHand ?? 0,
        bin: fields.bin,
        packSize: fields.packSize,
        grade: fields.grade,
        leadTimeDays: fields.leadTimeDays,
        automaticMaxQty: fields.automaticMaxQty,
        automaticMinQty: fields.automaticMinQty,
        fixedMaxQty: fields.fixedMaxQty,
        fixedMinQty: fields.fixedMinQty,
        netSupplierBuyPrice: fields.netSupplierBuyPrice,
        isTaxable: fields.isTaxable ?? true,
        landedFactor: fields.landedFactor,
        importDuty: fields.importDuty,
        inStoreCost: fields.inStoreCost,
        landedCost: fields.landedCost,
        agentFactor: fields.agentFactor,
        agentPrice: fields.agentPrice,
        partnerFactor: fields.partnerFactor,
        salesPartnerPrice: fields.salesPartnerPrice,
        tradeFactor: fields.tradeFactor,
        tradePrice: fields.tradePrice,
        retailFactor: fields.retailFactor,
        retailPrice: fields.retailPrice,
        agentFactorLocked: fields.agentFactorLocked ?? false,
        partnerFactorLocked: fields.partnerFactorLocked ?? false,
        tradeFactorLocked: fields.tradeFactorLocked ?? false,
        retailFactorLocked: fields.retailFactorLocked ?? false,
        isFmHardware: fields.isFmHardware ?? false,
        fmUnitCode: fields.fmUnitCode,
        fmMixCode: fields.fmMixCode,
        fourGUnitModem: fields.fourGUnitModem ?? false,
        mixUnitSim: fields.mixUnitSim ?? false,
        isMonitor: fields.isMonitor ?? false,
        isVision: fields.isVision ?? false,
        fmRuleCode: fields.fmRuleCode,
        primarySupplierId: fields.primarySupplierId,
        notes: fields.notes,
        minStock: fields.minStock,
        maxStock: fields.maxStock,
      },
    });

    if (bogLines?.length) {
      await (this.prisma as any).productBogLine.createMany({
        data: bogLines.map((l, i) => ({
          parentProductId: item.id,
          componentId: l.componentId,
          quantity: l.quantity,
          uom: l.uom ?? 'Each',
          sortOrder: l.sortOrder ?? i,
        })),
      });
    }

    return this.findById(item.id);
  }

  async update(id: string, dto: UpdateItemDto) {
    await this.findById(id);

    if (dto.productCode) {
      const conflict = await db(this.prisma).findFirst({
        where: { productCode: dto.productCode, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new ConflictException(`Product code '${dto.productCode}' already exists`);
    }

    const { bogLines, ...fields } = dto;

    const data = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );

    console.log(data, "___________________________________________");


    await db(this.prisma).update({ where: { id }, data });

    if (bogLines !== undefined) {
      await (this.prisma as any).productBogLine.deleteMany({ where: { parentProductId: id } });
      if (bogLines.length) {
        await (this.prisma as any).productBogLine.createMany({
          data: bogLines.map((l, i) => ({
            parentProductId: id,
            componentId: l.componentId,
            quantity: l.quantity,
            uom: l.uom ?? 'Each',
            sortOrder: l.sortOrder ?? i,
          })),
        });
      }
    }

    return this.findById(id);
  }

  async salesSummary(id: string) {
    await this.findById(id);
    const prismaAny = this.prisma as any;

    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear(), 0, 1);
    const y2Start = new Date(now.getFullYear() - 2, 0, 1);
    const y3Start = new Date(now.getFullYear() - 3, 0, 1);

    const soldQty = async (from: Date, to: Date) => {
      const result = await prismaAny.salesOrderItem.aggregate({
        where: {
          productId: id,
          createdAt: { gte: from, lt: to },
        },
        _sum: { quantity: true },
      });
      return Number(result._sum?.quantity ?? 0);
    };

    const buyQty = async (from: Date, to: Date) => {
      const result = await prismaAny.goodsReceiptLine.aggregate({
        where: {
          productId: id,
          createdAt: { gte: from, lt: to },
        },
        _sum: { receivedQty: true },
      });
      return Number(result._sum?.receivedQty ?? 0);
    };

    const [soldCY, soldLY, soldY2, soldY3, buyCY, buyLY] = await Promise.all([
      soldQty(currentYearStart, now),
      soldQty(lastYearStart, lastYearEnd),
      soldQty(y2Start, lastYearStart),
      soldQty(y3Start, y2Start),
      buyQty(currentYearStart, now),
      buyQty(lastYearStart, lastYearEnd),
    ]);

    return {
      currentYear: { sold: soldCY, buy: buyCY },
      lastYear: { sold: soldLY, buy: buyLY },
      avgY2Y3: { sold: +((soldY2 + soldY3) / 2).toFixed(1) },
      total: { sold: soldCY + soldLY + soldY2 + soldY3 },
    };
  }

  async salesHistory(id: string) {
    await this.findById(id);
    const prismaAny = this.prisma as any;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [salesLines, buyLines] = await Promise.all([
      prismaAny.salesOrderItem.findMany({
        where: {
          productId: id,
          createdAt: { gte: yearStart },
        },
        select: { quantity: true, createdAt: true },
      }),
      prismaAny.goodsReceiptLine.findMany({
        where: {
          productId: id,
          createdAt: { gte: yearStart },
        },
        select: { receivedQty: true, createdAt: true },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: new Date(now.getFullYear(), i, 1).toLocaleString('en', { month: 'short' }),
      sales: 0,
      buy: 0,
    }));

    for (const l of salesLines) {
      const mo = new Date(l.createdAt).getMonth();
      months[mo].sales += Number(l.quantity);
    }
    for (const l of buyLines) {
      const mo = new Date(l.createdAt).getMonth();
      months[mo].buy += Number(l.receivedQty);
    }

    return months;
  }

  async backOrders(id: string) {
    await this.findById(id);
    const prismaAny = this.prisma;

    const lines = await prismaAny.salesOrderItem.findMany({
      where: {
        productId: id,
        backOrderQty: { gt: 0 },
        deletedAt: null,
      },
      include: {
        salesOrder: {
          select: {
            orderNumber: true,
            status: true,
            actionDate: true,
            customer: { select: { customerNumber: true, name: true } },
          },
        },
        product: {
          select: { productCode: true, name: true, vendorName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return lines.map((l) => ({
      id: l.id,
      salesOrderId: l.salesOrderId,
      partNo: l.product.productCode,
      description: l.product.name,
      customer: l.salesOrder.customer.name,
      orderNo: l.salesOrder.orderNumber,
      qtyBackorder: l.backOrderQty,
      expectedDate: l.salesOrder.actionDate,
      supplier: l.product.vendorName ?? '—',
      status: l.salesOrder.status,
    }));
  }

  async purchaseOrders(id: string) {
    await this.findById(id);
    const prismaAny = this.prisma;

    const lines = await prismaAny.purchaseOrderLine.findMany({
      where: {
        productId: id,
      },
      include: {
        purchaseOrder: {
          select: {
            createdAt: true,
            expectedDate: true,
            id: true,
            orderDate: true,
            orderNumber: true,
            orderType: true,
            receivedDate: true,
            status: true
          }
        },
        product: {
          select: { productCode: true, name: true, vendorName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return lines
  }

  async remove(id: string) {
    await this.findById(id);

    const prismaAny = this.prisma as any;

    // Prisma client property names
    const checks: { label: string; model: string }[] = [
      { label: 'sales orders', model: 'salesOrderItem' },
      { label: 'quotations', model: 'quotationItem' },
      { label: 'invoices', model: 'invoiceItem' },
      { label: 'FM preinstalls', model: 'fMPreinstallItem' },
      { label: 'purchase orders', model: 'purchaseOrderLine' },
    ];

    const linkedLabels: string[] = [];

    for (const { label, model } of checks) {
      if (typeof prismaAny[model]?.count !== 'function') {
        console.warn(`[ItemsService.remove] Prisma model "${model}" not found — skipping`);
        continue;
      }
      const count = await prismaAny[model].count({ where: { productId: id } });
      if (count > 0) linkedLabels.push(label);
    }

    if (linkedLabels.length > 0) {
      throw new ConflictException(
        `This item cannot be deleted because it is linked to: ${linkedLabels.join(', ')}.`,
      );
    }

    // Safe to soft-delete
    return db(this.prisma).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
