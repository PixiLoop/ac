import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

export interface SupplierListQuery {
  search?: string;
  status?: string;
  skip?: number;
  take?: number;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

// prisma.invSupplier is available after `prisma generate` is run against the updated schema
const db = (prisma: PrismaService) => (prisma as any).invSupplier;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SupplierListQuery = {}) {
    const { search, status, skip = 0, take = 20, sortKey = 'name', sortDir = 'asc' } = query;

    const where: Record<string, any> = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
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
          code: true,
          name: true,
          status: true,
          repContactName: true,
          repContactPhone: true,
          repContactEmail: true,
          paymentMethod: true,
          activeSupplierForAai: true,
        },
      }),
      db(this.prisma).count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findById(id: string) {
    const supplier = await db(this.prisma).findFirst({
      where: { id, deletedAt: null },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');

    // Derive account stats from purchase orders and goods receipts
    const [orders, receipts] = await this.prisma.$transaction([
      (this.prisma as any).purchaseOrder.findMany({
        where: { supplierId: id, deletedAt: null },
        orderBy: { orderDate: 'desc' },
        select: { orderNumber: true, orderDate: true, total: true, status: true },
      }),
      (this.prisma as any).goodsReceipt.findMany({
        where: { supplierId: id, deletedAt: null },
        orderBy: { receiptDate: 'desc' },
        select: { receiptNumber: true, receiptDate: true },
      }),
    ]);

    const lastOrder = orders[0];
    const lastReceipt = receipts[0];

    // Outstanding balance = sum of non-closed/non-received PO totals
    const currentBalance = orders
      .filter((o: any) => !['RECEIVED', 'CLOSED'].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);

    // Transaction history: group PO totals by year
    const byYear: Record<string, { purchases: number }> = {};
    for (const o of orders) {
      const yr = new Date(o.orderDate).getFullYear().toString();
      if (!byYear[yr]) byYear[yr] = { purchases: 0 };
      byYear[yr].purchases += Number(o.total ?? 0);
    }
    const transactionHistory = Object.entries(byYear)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, v]) => ({ year, purchases: v.purchases, payments: 0 }));

    return {
      ...supplier,
      currentBalance,
      lastInvoice: lastOrder?.orderNumber ?? null,
      lastTransaction: lastOrder ? new Date(lastOrder.orderDate).toLocaleDateString('en-AU') : null,
      lastExpRecord: lastReceipt?.receiptNumber ?? null,
      transactionHistory,
    };
  }

  async create(dto: CreateSupplierDto) {
    const existing = await db(this.prisma).findUnique({
      where: { code: dto.code },
    });

    if (existing) throw new ConflictException(`Supplier code '${dto.code}' already exists`);

    return db(this.prisma).create({
      data: {
        code: dto.code,
        name: dto.name,
        status: dto.status ?? 'ACTIVE',
        abn: dto.abn,
        deliveryAddress1: dto.deliveryAddress1,
        deliveryAddress2: dto.deliveryAddress2,
        deliveryAddress3: dto.deliveryAddress3,
        postalAddress1: dto.postalAddress1,
        postalAddress2: dto.postalAddress2,
        postalAddress3: dto.postalAddress3,
        serviceRep: dto.serviceRep,
        orderPhone: dto.orderPhone,
        orderEmail: dto.orderEmail,
        ordersClose: dto.ordersClose,
        minOrderValue: dto.minOrderValue,
        freightCost: dto.freightCost,
        freightCutsAt: dto.freightCutsAt,
        airBagClose: dto.airBagClose,
        airBagCost: dto.airBagCost,
        orderLandedFactor: dto.orderLandedFactor,
        orderMethod: dto.orderMethod,
        dispatchMethod: dto.dispatchMethod,
        useSupplierPartNumber: dto.useSupplierPartNumber ?? false,
        activeSupplierForAai: dto.activeSupplierForAai ?? false,
        expenseTypeCode: dto.expenseTypeCode,
        expenseTypeKey: dto.expenseTypeKey,
        repContactName: dto.repContactName,
        repContactPhone: dto.repContactPhone,
        repContactMobile: dto.repContactMobile,
        repContactEmail: dto.repContactEmail,
        accContactName: dto.accContactName,
        accContactPhone: dto.accContactPhone,
        accContactFax: dto.accContactFax,
        accContactEmail: dto.accContactEmail,
        warContactName: dto.warContactName,
        warContactPhone: dto.warContactPhone,
        warContactFax: dto.warContactFax,
        warContactEmail: dto.warContactEmail,
        tradingTerms: dto.tradingTerms,
        paymentMethod: dto.paymentMethod,
        billerCodeBsb: dto.billerCodeBsb,
        accountReference: dto.accountReference,
        creditLimit: dto.creditLimit,
        currencyCode: dto.currencyCode ?? 'AUD',
        poAttachmentType: dto.poAttachmentType ?? 'PDF',
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findById(id);

    if (dto.code) {
      const conflict = await db(this.prisma).findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new ConflictException(`Supplier code '${dto.code}' already exists`);
    }

    return db(this.prisma).update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.abn !== undefined && { abn: dto.abn }),
        ...(dto.deliveryAddress1 !== undefined && { deliveryAddress1: dto.deliveryAddress1 }),
        ...(dto.deliveryAddress2 !== undefined && { deliveryAddress2: dto.deliveryAddress2 }),
        ...(dto.deliveryAddress3 !== undefined && { deliveryAddress3: dto.deliveryAddress3 }),
        ...(dto.postalAddress1 !== undefined && { postalAddress1: dto.postalAddress1 }),
        ...(dto.postalAddress2 !== undefined && { postalAddress2: dto.postalAddress2 }),
        ...(dto.postalAddress3 !== undefined && { postalAddress3: dto.postalAddress3 }),
        ...(dto.serviceRep !== undefined && { serviceRep: dto.serviceRep }),
        ...(dto.orderPhone !== undefined && { orderPhone: dto.orderPhone }),
        ...(dto.orderEmail !== undefined && { orderEmail: dto.orderEmail }),
        ...(dto.ordersClose !== undefined && { ordersClose: dto.ordersClose }),
        ...(dto.minOrderValue !== undefined && { minOrderValue: dto.minOrderValue }),
        ...(dto.freightCost !== undefined && { freightCost: dto.freightCost }),
        ...(dto.freightCutsAt !== undefined && { freightCutsAt: dto.freightCutsAt }),
        ...(dto.airBagClose !== undefined && { airBagClose: dto.airBagClose }),
        ...(dto.airBagCost !== undefined && { airBagCost: dto.airBagCost }),
        ...(dto.orderLandedFactor !== undefined && { orderLandedFactor: dto.orderLandedFactor }),
        ...(dto.orderMethod !== undefined && { orderMethod: dto.orderMethod }),
        ...(dto.dispatchMethod !== undefined && { dispatchMethod: dto.dispatchMethod }),
        ...(dto.useSupplierPartNumber !== undefined && { useSupplierPartNumber: dto.useSupplierPartNumber }),
        ...(dto.activeSupplierForAai !== undefined && { activeSupplierForAai: dto.activeSupplierForAai }),
        ...(dto.expenseTypeCode !== undefined && { expenseTypeCode: dto.expenseTypeCode }),
        ...(dto.expenseTypeKey !== undefined && { expenseTypeKey: dto.expenseTypeKey }),
        ...(dto.repContactName !== undefined && { repContactName: dto.repContactName }),
        ...(dto.repContactPhone !== undefined && { repContactPhone: dto.repContactPhone }),
        ...(dto.repContactMobile !== undefined && { repContactMobile: dto.repContactMobile }),
        ...(dto.repContactEmail !== undefined && { repContactEmail: dto.repContactEmail }),
        ...(dto.accContactName !== undefined && { accContactName: dto.accContactName }),
        ...(dto.accContactPhone !== undefined && { accContactPhone: dto.accContactPhone }),
        ...(dto.accContactFax !== undefined && { accContactFax: dto.accContactFax }),
        ...(dto.accContactEmail !== undefined && { accContactEmail: dto.accContactEmail }),
        ...(dto.warContactName !== undefined && { warContactName: dto.warContactName }),
        ...(dto.warContactPhone !== undefined && { warContactPhone: dto.warContactPhone }),
        ...(dto.warContactFax !== undefined && { warContactFax: dto.warContactFax }),
        ...(dto.warContactEmail !== undefined && { warContactEmail: dto.warContactEmail }),
        ...(dto.tradingTerms !== undefined && { tradingTerms: dto.tradingTerms }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.billerCodeBsb !== undefined && { billerCodeBsb: dto.billerCodeBsb }),
        ...(dto.accountReference !== undefined && { accountReference: dto.accountReference }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.poAttachmentType !== undefined && { poAttachmentType: dto.poAttachmentType }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return db(this.prisma).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
