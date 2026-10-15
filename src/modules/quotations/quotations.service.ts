import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { UpdateQuotationItemsDto } from './dto/update-quotation-items.dto';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) { }

  async list(query: any) {
    const where: Prisma.QuotationWhereInput = {
      deletedAt: null,
    };

    const items = await this.prisma.quotation.findMany({
      where: {
        customerId: query.customerID ?? undefined,
        ...where
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { items };
  }

  async findById(id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        groups: {
          where: { deletedAt: null },
          include: {
            items: {
              where: { deletedAt: null },
            },
          },
        },
        customer: {
          select: {
            gstExempt: true
          }
        }
      },
    });

    if (!quotation)
      throw new NotFoundException('Quotation not found');

    return quotation;
  }


  async create(dto: CreateQuotationDto) {

    const quoteNumber = await this.generateQuoteNumber();

    const quotation = await this.prisma.quotation.create({
      data: {
        quoteNumber,
        customerId: dto.customerId,
        quotationDate: dto.quotationDate,
        expiryDate: dto.expiryDate,

        requestNumber: dto.requestNumber,

        priceLevel: dto.priceLevel as any,
        paymentTerms: dto.paymentTerms as any,

        salesFactor: dto.salesFactor,

        shippingName: dto.shippingName,
        shippingAddress1: dto.shippingAddress1,
        shippingCity: dto.shippingCity,
        shippingState: dto.shippingState,
        shippingPostcode: dto.shippingPostcode,

        billingName: dto.billingName,
        billingAddress1: dto.billingAddress1,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostcode: dto.billingPostcode,

        hasPremium: dto.hasPremium ?? false,
        hasEssential: dto.hasEssential ?? false,
        hasOngoing: dto.hasOngoing ?? false,

        sundries: dto.sundries,
        labour: dto.labour,
        rounding: dto.rounding,
        otherCharges: dto.otherCharges,
        dispatchMethod: dto.dispatchMethod ?? null,

        createdBy: dto.createdBy ?? 'System',
      },
    });

    await this.createGroups(quotation.id, dto);

    return quotation;
  }

  async update(id: string, dto: UpdateQuotationDto) {
    await this.findById(id);

    return this.prisma.quotation.update({
      where: { id },
      data: {
        // Use !== undefined so empty strings "" are saved correctly
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.priceLevel !== undefined && { priceLevel: dto.priceLevel as any }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms as any }),
        ...(dto.quotationDate !== undefined && { quotationDate: dto.quotationDate }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate }),
        ...(dto.salesFactor !== undefined && { salesFactor: dto.salesFactor }),
        ...(dto.requestNumber !== undefined && { requestNumber: dto.requestNumber }),

        ...(dto.hasPremium !== undefined && { hasPremium: dto.hasPremium }),
        ...(dto.hasEssential !== undefined && { hasEssential: dto.hasEssential }),
        ...(dto.hasOngoing !== undefined && { hasOngoing: dto.hasOngoing }),

        // Shipping
        ...(dto.shippingName !== undefined && { shippingName: dto.shippingName }),
        ...(dto.shippingAddress1 !== undefined && { shippingAddress1: dto.shippingAddress1 }),
        ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
        ...(dto.shippingState !== undefined && { shippingState: dto.shippingState }),
        ...(dto.shippingPostcode !== undefined && { shippingPostcode: dto.shippingPostcode }),

        // Billing
        ...(dto.billingName !== undefined && { billingName: dto.billingName }),
        ...(dto.billingAddress1 !== undefined && { billingAddress1: dto.billingAddress1 }),
        ...(dto.billingCity !== undefined && { billingCity: dto.billingCity }),
        ...(dto.billingState !== undefined && { billingState: dto.billingState }),
        ...(dto.billingPostcode !== undefined && { billingPostcode: dto.billingPostcode }),

        ...(dto.sundries !== undefined && { sundries: dto.sundries }),
        ...(dto.labour !== undefined && { labour: dto.labour }),
        ...(dto.rounding !== undefined && { rounding: dto.rounding }),
        ...(dto.otherCharges !== undefined && { otherCharges: dto.otherCharges }),
        ...(dto.dispatchMethod !== undefined && { dispatchMethod: dto.dispatchMethod ?? null }),

      },
    });
  }

  async updateGroupItems(
    quotationId: string,
    groupType: string,
    dto: UpdateQuotationItemsDto,
  ) {
    let group = await this.prisma.quotationGroup.findFirst({
      where: {
        quotationId,
        groupType: groupType as any,
        deletedAt: null,
      },
    });

    if (!group) {
      group = await this.prisma.quotationGroup.create({
        data: {
          quotationId,
          groupType: groupType as any,
        },
      });
    }

    const cleanItems = dto.items.map(i => ({
      id: i.id,
      productId: i.productId,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discountPct: Number(i.discountPct ?? 0),
      landedCost: Number(i.landedCost ?? 0),
      retailPrice: Number(i.retailPrice ?? 0),
      tradePrice: Number(i.tradePrice ?? 0),
      salesPartnerPrice: Number(i.salesPartnerPrice ?? 0),
      agentPrice: Number(i.agentPrice ?? 0),
      lineTotal:
        Number(i.quantity) *
        Number(i.unitPrice) *
        (1 - Number(i.discountPct ?? 0) / 100),
    }));

    const keepIds = cleanItems
      .map(i => i.id)
      .filter(Boolean) as string[];

    await this.prisma.$transaction(async tx => {
      if (keepIds.length > 0) {
        await tx.quotationItem.updateMany({
          where: {
            groupId: group.id,
            deletedAt: null,
            id: { notIn: keepIds },
          },
          data: { deletedAt: new Date() },
        });
      }

      for (const item of cleanItems) {
        await tx.quotationItem.upsert({
          where: { id: item.id ?? '__new__' },
          create: {
            quotationId,
            groupId: group.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            lineTotal: item.lineTotal,
            landedCost: item.landedCost,
            agentPrice: item.agentPrice,
            retailPrice: item.retailPrice,
            salesPartnerPrice: item.salesPartnerPrice,
            tradePrice: item.tradePrice
          },
          update: {
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            lineTotal: item.lineTotal,
            deletedAt: null,
            landedCost: item.landedCost,
            agentPrice: item.agentPrice,
            retailPrice: item.retailPrice,
            salesPartnerPrice: item.salesPartnerPrice,
            tradePrice: item.tradePrice
          },
        });
      }
    });

    return this.recalculateGroupTotals(group.id);
  }

  async softDelete(id: string) {
    await this.findById(id);

    await this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  private async generateQuoteNumber() {
    const count = await this.prisma.quotation.count();
    return `QT-${5000 + count + 1}`;
  }

  private async createGroups(id: string, dto: CreateQuotationDto) {
    const groups = [];

    if (dto.hasGeneral)
      groups.push({ groupType: 'GENERAL' });

    if (dto.hasPremium)
      groups.push({ groupType: 'PREMIUM' });

    if (dto.hasEssential)
      groups.push({ groupType: 'ESSENTIAL' });

    if (dto.hasOngoing)
      groups.push({ groupType: 'ONGOING' });

    for (const g of groups) {
      await this.prisma.quotationGroup.create({
        data: {
          quotationId: id,
          groupType: g.groupType as any,
        },
      });
    }
  }

  private async recalculateGroupTotals(groupId: string) {
    const items = await this.prisma.quotationItem.findMany({
      where: { groupId, deletedAt: null },
    });

    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.lineTotal),
      0,
    );

    const gst = subtotal * 0.1;
    const total = subtotal + gst;

    return this.prisma.quotationGroup.update({
      where: { id: groupId },
      data: { subtotal, gst, total },
    });
  }
}