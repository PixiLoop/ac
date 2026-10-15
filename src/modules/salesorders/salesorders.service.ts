import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Prisma,
  SalesOrderStatus,
  SalesOrderType,
  PriceLevel,
  PaymentTerms
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { ListSalesOrdersDto } from './dto/list-salesorders.dto';
import { CreateSalesOrderDto } from './dto/create-salesorder.dto';
import { UpdateSalesOrderDto } from './dto/update-salesorder.dto';
import { UpdateSalesOrderItemsDto } from './dto/update-salesorder-items.dto';

@Injectable()

export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildMultiDateFilter(values: string) {
    const dates = values.split(',');

    return {
      OR: dates.map(dateStr => {
        const [day, month, year] = dateStr.split('/');

        const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

        return {
          gte: start,
          lte: end,
        };
      }),
    };
  }

  async list(dto: ListSalesOrdersDto) {
    const and: Prisma.SalesOrderWhereInput[] = [
      { deletedAt: null },
    ];

    if (dto.search) {
      and.push({
        OR: [
          { orderNumber: { contains: dto.search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: dto.search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (dto.filter_orderNumber) {
      and.push({
        orderNumber: {
          in: dto.filter_orderNumber.split(','),
        },
      });
    }

    if (dto.filter_status) {
      and.push({
        status: {
          in: dto.filter_status.split(',') as SalesOrderStatus[],
        },
      });
    }

    if (dto.filter_customer) {
      and.push({
        customer: {
          name: {
            in: dto.filter_customer.split(','),
          },
        },
      });
    }

    if (dto.filter_actionDate) {
      const dates = dto.filter_actionDate.split(',');

      and.push({
        OR: dates.map(dateStr => {
          const [day, month, year] = dateStr.split('/');
          const start = new Date(Number(year), Number(month) - 1, Number(day));
          const end = new Date(Number(year), Number(month) - 1, Number(day) + 1);

          return {
            actionDate: {
              gte: start,
              lt: end,
            },
          };
        }),
      });
    }

    if (dto.filter_createdAt) {
      const dates = dto.filter_createdAt.split(',');

      and.push({
        OR: dates.map(dateStr => {
          const [day, month, year] = dateStr.split('/');
          const start = new Date(Number(year), Number(month) - 1, Number(day));
          const end = new Date(Number(year), Number(month) - 1, Number(day) + 1);

          return {
            createdAt: {
              gte: start,
              lt: end,
            },
          };
        }),
      });
    }

    const where: Prisma.SalesOrderWhereInput = {
      AND: and,
    };

    let orderBy: Prisma.SalesOrderOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (dto.sortKey) {
      const dir: Prisma.SortOrder =
        dto.sortDir === 'desc' ? 'desc' : 'asc';

      if (dto.sortKey === 'customer') {
        orderBy = {
          customer: { name: dir },
        };
      } else {
        orderBy = {
          [dto.sortKey]: dir,
        } as Prisma.SalesOrderOrderByWithRelationInput;
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where: {
          customerId: dto.customerId ?? undefined,
          ...where
        },
        skip: dto.skip,
        take: dto.take,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              customerNumber: true,
            },
          },
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          customerId: dto.customerId ?? undefined,
          ...where
        }
      }),
    ]);

    return { items, total };
  }

  // salesorders.service.ts findById()
  async findById(id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            product: {
              select: {
                id: true,
                productCode: true,
                onHand: true,
              },
            },
          },
        },
        // Quote this SO was created from, if any — used to render a
        // "back to quote" link on the Sales Order screen.
        fromQuotation: {
          select: { id: true, quoteNumber: true },
        },
        customer: {
          select: {
            name: true,
            customerNumber: true
          }
        }
      },
    });

    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }


  // async findById(id: string) {
  //   const order = await this.prisma.salesOrder.findFirst({
  //     where: { id, deletedAt: null },
  //     include: {
  //       items: { where: { deletedAt: null } },
  //     },
  //   });

  //   if (!order) throw new NotFoundException('Sales order not found');
  //   return order;
  // }

  private assertForwardHasActionDate(orderType?: string | null, actionDate?: Date | null) {
    if (orderType === 'FORWARD' && !actionDate) {
      throw new BadRequestException('Action Date is required for a Forward order');
    }
  }

  async create(dto: CreateSalesOrderDto) {
    this.assertForwardHasActionDate(dto.orderType, dto.actionDate);
    const orderNumber = await this.generateOrderNumber();

    const salesOrder = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        orderType: dto.orderType as SalesOrderType,
        priceLevel: dto.priceLevel as PriceLevel,
        paymentTerms: dto.paymentTerms as PaymentTerms,
        actionDate: dto.actionDate,
        salesFactor: dto.salesFactor,
        freight: dto.orderType === 'WITH_OTHER_GOODS' ? (dto.freight ?? 0) : dto.freight,
        sundries: dto.sundries,
        labour: dto.labour,
        rounding: dto.rounding,
        otherCharges: dto.otherCharges,
        customerPO: dto.customerPO,
        internalNotes: dto.internalNotes,
        externalNotes: dto.externalNotes,

        shippingName: dto.shippingName,
        shippingAddress1: dto.shippingAddress1,
        shippingAddress2: dto.shippingAddress2,
        shippingAddress3: dto.shippingAddress3,
        shippingCity: dto.shippingCity,
        shippingState: dto.shippingState,
        shippingPostcode: dto.shippingPostcode,
        shippingCountry: dto.shippingCountry,
        sameAsCustomer: dto.sameAsCustomer,

        billingName: dto.billingName,
        billingAddress1: dto.billingAddress1,
        billingAddress2: dto.billingAddress2,
        billingAddress3: dto.billingAddress3,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostcode: dto.billingPostcode,
        billingCountry: dto.billingCountry,
        status: dto?.status || "PENDING",
        dispatchMethod: dto.orderType === 'WITH_OTHER_GOODS'
          ? (dto.dispatchMethod || 'W.O.G')
          : (dto.dispatchMethod || null),

        customer: {
          connect: { id: dto.customerId },
        },

        // ← CHANGE: relation connect బదులు direct field
        ...(dto.quotationId && {
          fromQuotation: {
            connect: { id: dto.quotationId },
          },
        }),
      },
    });

    // Quotation back-link update
    if (dto.quotationId) {
      await this.prisma.quotation.update({
        where: { id: dto.quotationId },
        data: { salesOrderId: salesOrder.id },
      });
    }

    return salesOrder;
  }

  async update(id: string, dto: UpdateSalesOrderDto) {
    const existing = await this.findById(id);
    const orderType = dto.orderType ?? existing.orderType;
    const actionDate = dto.actionDate !== undefined ? dto.actionDate : existing.actionDate;
    this.assertForwardHasActionDate(orderType, actionDate);

    const data: Prisma.SalesOrderUpdateInput = {
      ...(dto.orderType && {
        orderType: dto.orderType as SalesOrderType,
      }),
      ...(dto.status && {
        status: dto.status as SalesOrderStatus,
      }),
      ...(dto.priceLevel && {
        priceLevel: dto.priceLevel as PriceLevel,
      }),
      ...(dto.actionDate && { actionDate: dto.actionDate }),
      ...(dto.salesFactor !== undefined && {
        salesFactor: dto.salesFactor,
      }),
      ...(dto.paymentTerms && {
        paymentTerms: dto.paymentTerms as PaymentTerms,
      }),
      ...(dto.freight !== undefined && {
        freight: dto.freight,
      }),
      ...(dto.sundries !== undefined && {
        sundries: dto.sundries,
      }),
      ...(dto.labour !== undefined && {
        labour: dto.labour,
      }),
      ...(dto.rounding !== undefined && {
        rounding: dto.rounding,
      }),
      ...(dto.otherCharges !== undefined && {
        otherCharges: dto.otherCharges,
      }),
      ...(dto.customerPO !== undefined && {
        customerPO: dto.customerPO,
      }),

      ...(dto.internalNotes !== undefined && {
        internalNotes: dto.internalNotes,
      }),

      ...(dto.externalNotes !== undefined && {
        externalNotes: dto.externalNotes,
      }),

      ...(dto.shippingName !== undefined && {
        shippingName: dto.shippingName,
      }),
      ...(dto.shippingAddress1 !== undefined && {
        shippingAddress1: dto.shippingAddress1,
      }),
      ...(dto.shippingAddress2 !== undefined && {
        shippingAddress2: dto.shippingAddress2,
      }),
      ...(dto.shippingAddress3 !== undefined && {
        shippingAddress3: dto.shippingAddress3,
      }),
      ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
      ...(dto.shippingState !== undefined && { shippingState: dto.shippingState }),
      ...(dto.shippingPostcode !== undefined && { shippingPostcode: dto.shippingPostcode }),
      ...(dto.shippingCountry !== undefined && { shippingCountry: dto.shippingCountry }),
      ...(dto.sameAsCustomer !== undefined && {
        sameAsCustomer: dto.sameAsCustomer,
      }),

      ...(dto.billingName !== undefined && { billingName: dto.billingName }),
      ...(dto.billingAddress1 !== undefined && { billingAddress1: dto.billingAddress1 }),
      ...(dto.billingAddress2 !== undefined && { billingAddress2: dto.billingAddress2 }),
      ...(dto.billingAddress3 !== undefined && { billingAddress3: dto.billingAddress3 }),
      ...(dto.billingCity !== undefined && { billingCity: dto.billingCity }),
      ...(dto.billingState !== undefined && { billingState: dto.billingState }),
      ...(dto.billingPostcode !== undefined && { billingPostcode: dto.billingPostcode }),
      ...(dto.billingCountry !== undefined && { billingCountry: dto.billingCountry }),
      ...(dto.dispatchMethod !== undefined && { dispatchMethod: dto.dispatchMethod ?? null }),

    };

    return this.prisma.salesOrder.update({
      where: { id },
      data,
    });
  }

  async updateItems(id: string, dto: UpdateSalesOrderItemsDto) {
    console.log('DTO RECEIVED:', dto);
    await this.findById(id);

    for (const i of dto.items) {
      if (Number(i.quantity) < 0) {
        throw new BadRequestException(
          `Quantity cannot be negative for item ${i.productId}`,
        );
      }
    }

    const cleanItems = dto.items.map(({ id: itemId, ...i }) => ({
      id: itemId,
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

      // ── 1. Find lines being removed ──────────────────────────────
      const removedLines = await tx.salesOrderItem.findMany({
        where: {
          salesOrderId: id,
          deletedAt: null,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
        },
        select: { productId: true, backOrderQty: true, allocatedQty: true, },
      });

      // ── 2. Decrement backOrdered for removed lines ────────────────
      for (const removed of removedLines) {
        if (Number(removed.backOrderQty) > 0) {
          await tx.product.update({
            where: { id: removed.productId },
            data: { backOrdered: { decrement: Number(removed.backOrderQty) } },
          });
        }
        // ← add
        if (Number(removed.allocatedQty) > 0) {
          await tx.product.update({
            where: { id: removed.productId },
            data: { committed: { decrement: Number(removed.allocatedQty) } },
          });
        }
      }

      // ── 3. Soft delete removed lines ─────────────────────────────
      await tx.salesOrderItem.updateMany({
        where: {
          salesOrderId: id,
          deletedAt: null,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
        },
        data: { deletedAt: new Date() },
      });

      // ── 4. Upsert remaining lines + backorder logic ───────────────
      for (const item of cleanItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { onHand: true },
        });

        const onHand = Number(product?.onHand ?? 0);
        const backOrderQty = Math.max(0, item.quantity - onHand);
        const allocatedQty = item.quantity - backOrderQty;

        let prevBackOrderQty = 0;
        let prevAllocatedQty = 0;
        if (item.id) {
          const existing = await tx.salesOrderItem.findUnique({
            where: { id: item.id },
            select: { backOrderQty: true, allocatedQty: true, },
          });
          prevBackOrderQty = Number(existing?.backOrderQty ?? 0);
          prevAllocatedQty = Number(existing?.allocatedQty ?? 0);
        }

        await tx.salesOrderItem.upsert({
          where: { id: item.id ?? '__new__' },
          create: {
            salesOrderId: id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            lineTotal: item.lineTotal,
            allocatedQty,
            backOrderQty,
            deletedAt: null,
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
            allocatedQty,
            backOrderQty,
            landedCost: item.landedCost,
            deletedAt: null,
            agentPrice: item.agentPrice,
            retailPrice: item.retailPrice,
            salesPartnerPrice: item.salesPartnerPrice,
            tradePrice: item.tradePrice
          },
        });

        const diff = backOrderQty - prevBackOrderQty;
        if (diff !== 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { backOrdered: { increment: diff } },
          });
        }

        //Committed update:
        const committedDiff = allocatedQty - prevAllocatedQty;
        if (committedDiff !== 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { committed: { increment: committedDiff } },
          });
        }

      }
    });

    return this.recalculateTotals(id);
  }

  async softDelete(id: string) {
    await this.findById(id);

    await this.prisma.salesOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  private async generateOrderNumber() {
    const count = await this.prisma.salesOrder.count();
    return `SO-${4800 + count + 1}`;
  }

  private async recalculateTotals(id: string) {
    const items = await this.prisma.salesOrderItem.findMany({
      where: { salesOrderId: id, deletedAt: null },
    });

    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.lineTotal),
      0,
    );

    const gst = subtotal * 0.1;

    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        subtotal,
        gst,
        total: subtotal + gst,
      },
    });
  }
}