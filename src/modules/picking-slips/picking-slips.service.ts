import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PickingSlipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreatePickingSlipDto,
    UpdatePickingSlipDto,
    UpdatePickingSlipLinesDto,
    ListPickingSlipsDto,
} from './dto/picking-slip.dto';

@Injectable()
export class PickingSlipsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(dto: ListPickingSlipsDto) {
        const and: Prisma.PickingSlipWhereInput[] = [{ deletedAt: null }];

        if (dto.salesOrderId) {
            and.push({ salesOrderId: dto.salesOrderId });
        }

        if (dto.search) {
            and.push({
                OR: [
                    { slipNumber: { contains: dto.search, mode: 'insensitive' } },
                    { salesOrder: { orderNumber: { contains: dto.search, mode: 'insensitive' } } },
                ],
            });
        }

        if (dto.filter_status) {
            and.push({ status: { in: dto.filter_status.split(',') as PickingSlipStatus[] } });
        }

        const where: Prisma.PickingSlipWhereInput = { AND: and };

        let orderBy: Prisma.PickingSlipOrderByWithRelationInput = { createdAt: 'desc' };
        if (dto.sortKey) {
            const dir: Prisma.SortOrder = dto.sortDir === 'desc' ? 'desc' : 'asc';
            orderBy = { [dto.sortKey]: dir } as Prisma.PickingSlipOrderByWithRelationInput;
        }

        const [items, total] = await this.prisma.$transaction([
            this.prisma.pickingSlip.findMany({
                where,
                skip: dto.skip,
                take: dto.take,
                orderBy,
                include: {
                    salesOrder: { select: { id: true, orderNumber: true } },
                    lines: true,
                },
            }),
            this.prisma.pickingSlip.count({ where }),
        ]);

        return { items, total };
    }

    async findById(id: string) {
        const slip = await this.prisma.pickingSlip.findFirst({
            where: { id, deletedAt: null },
            include: {
                salesOrder: {
                    select: {
                        id: true,
                        orderNumber: true,
                        customer: { select: { id: true, name: true } },
                    },
                },
                lines: {
                    include: {
                        product: { select: { id: true, productCode: true, name: true } },
                    },
                },
            },
        });

        if (!slip) throw new NotFoundException('Picking slip not found');
        return slip;
    }

    // Create a picking slip from a Sales Order — pulls on-hand, ordered qty per line
    async createFromSalesOrder(dto: CreatePickingSlipDto) {
        // Idempotency: reuse an existing DRAFT slip instead of creating a duplicate
        const existingDraft = await this.prisma.pickingSlip.findFirst({
            where: { salesOrderId: dto.salesOrderId, status: 'DRAFT', deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        if (existingDraft) {
            return this.findById(existingDraft.id);
        }

        const so = await this.prisma.salesOrder.findFirst({
            where: { id: dto.salesOrderId, deletedAt: null },
            include: {
                items: {
                    where: { deletedAt: null },
                    include: { product: { select: { onHand: true } } },
                },
            },
        });

        if (!so) throw new NotFoundException('Sales order not found');
        if (!so.items.length) throw new BadRequestException('Sales order has no items to pick');

        const slipNumber = await this.generateSlipNumber();

        const slip = await this.prisma.pickingSlip.create({
            data: {
                slipNumber,
                salesOrderId: so.id,
                status: 'DRAFT',
                pickedBy: dto.pickedBy ?? null,
                notes: dto.notes ?? null,
                lines: {
                    create: so.items.map(item => {
                        const onHand = Number(item.product?.onHand ?? 0);
                        const ordered = Number(item.quantity);
                        // Default suggested pick = min(onHand, ordered) — matches
                        // legacy behaviour ("this is how many we're going to pick off the shelf")
                        const suggestedPick = Math.max(0, Math.min(onHand, ordered));

                        return {
                            productId: item.productId,
                            description: item.description,
                            onHandQty: onHand,
                            orderedQty: ordered,
                            pickedQty: suggestedPick,
                        };
                    }),
                },
            },
        });

        return this.findById(slip.id);
    }

    async update(id: string, dto: UpdatePickingSlipDto) {
        await this.findById(id);

        return this.prisma.pickingSlip.update({
            where: { id },
            data: {
                ...(dto.status !== undefined && { status: dto.status as PickingSlipStatus }),
                ...(dto.pickedBy !== undefined && { pickedBy: dto.pickedBy }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
        });
    }

    async updateLines(id: string, dto: UpdatePickingSlipLinesDto) {
        await this.findById(id);

        for (const line of dto.lines) {
            if (Number(line.pickedQty) < 0) {
                throw new BadRequestException(
                    `Picked quantity cannot be negative for item ${line.productId}`,
                );
            }
        }

        await this.prisma.$transaction(async tx => {
            for (const line of dto.lines) {
                await tx.pickingSlipLine.upsert({
                    where: { id: line.id ?? '__new__' },
                    create: {
                        pickingSlipId: id,
                        productId: line.productId,
                        description: line.description,
                        onHandQty: line.onHandQty,
                        orderedQty: line.orderedQty,
                        pickedQty: line.pickedQty,
                    },
                    update: {
                        onHandQty: line.onHandQty,
                        orderedQty: line.orderedQty,
                        pickedQty: line.pickedQty,
                    },
                });
            }
        });

        return this.findById(id);
    }

    async complete(id: string) {
        await this.findById(id);
        return this.prisma.pickingSlip.update({
            where: { id },
            data: { status: 'COMPLETED' },
        });
    }

    async softDelete(id: string) {
        await this.findById(id);
        await this.prisma.pickingSlip.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return { success: true };
    }

    // Dynamic, non-persisted warehouse-wide picking list.
    // Groups eligible Sales Orders by Customer and picks oldest entry
    // (createdAt) first, computes per-line and per-order fulfilment from
    // current stock on hand, and lets the caller include/exclude WORKSHOP
    // (On-Site Dispatch) orders.
    async generate(dto: {
        customerIds?: string;
        salesOrderIds?: string;
        includeOnSite?: string;
    }) {
        const where: Prisma.SalesOrderWhereInput = {
            deletedAt: null,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            // Exclude SOs whose action date is still in the future — they
            // should only appear on the picking list once that date arrives (BG: picking slip future-date exclusion)
            OR: [
                { actionDate: null },
                { actionDate: { lte: new Date() } },
            ],
        };

        if (dto.customerIds) {
            where.customerId = { in: dto.customerIds.split(',') };
        }
        if (dto.salesOrderIds) {
            where.id = { in: dto.salesOrderIds.split(',') };
        }
        if (dto.includeOnSite === 'false') {
            where.orderType = { not: 'WORKSHOP' };
        }

        const orders = await this.prisma.salesOrder.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, customerNumber: true } },
                items: {
                    where: { deletedAt: null },
                    include: {
                        product: {
                            select: {
                                id: true, productCode: true, name: true, onHand: true,
                                // Real bin/location data lives in ProductLocation, not Product.bin
                                // (that field is legacy/unused). Take the Primary warehouse location.
                                productLocations: {
                                    where: { isPrimary: true },
                                    take: 1,
                                    include: { location: { select: { code: true } } },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: 'asc' }, { orderNumber: 'asc' }],
        });

        if (!orders.length) {
            return { customers: [] };
        }

        // Already-invoiced qty per (salesOrderId, productId), across all relevant SOs in one query
        const soIds = orders.map(o => o.id);
        const invoices = await this.prisma.invoice.findMany({
            where: { salesOrderId: { in: soIds }, deletedAt: null, status: { not: 'CANCELLED' } },
            include: { items: { where: { deletedAt: null } } },
        });

        const invoicedQtyMap = new Map<string, number>(); // key: `${salesOrderId}:${productId}`
        for (const inv of invoices) {
            if (!inv.salesOrderId) continue;
            for (const item of inv.items) {
                const key = `${inv.salesOrderId}:${item.productId}`;
                invoicedQtyMap.set(key, (invoicedQtyMap.get(key) ?? 0) + item.quantity);
            }
        }

        // Build per-SO line data, skip SOs that are fully invoiced already
        const customerMap = new Map<string, any>();

        for (const so of orders) {
            const lines = so.items
                .map(item => {
                    const invoiced = invoicedQtyMap.get(`${so.id}:${item.productId}`) ?? 0;
                    const remaining = item.quantity - invoiced;
                    return { item, remaining };
                })
                .filter(({ remaining }) => remaining > 0)
                .map(({ item, remaining }) => {
                    const onHand = Number(item.product?.onHand ?? 0);
                    const pickQty = Math.max(0, Math.min(onHand, remaining));
                    const lineStatus =
                        pickQty >= remaining ? 'FULLY_FULFILLABLE'
                            : pickQty > 0 ? 'PARTIALLY_FULFILLABLE'
                                : 'NOT_FULFILLABLE';

                    const primaryLoc = item.product?.productLocations?.[0];
                    const binLocation = primaryLoc?.binCode || primaryLoc?.location?.code || '';


                    return {
                        productId: item.productId,
                        partNo: item.product?.productCode ?? '',
                        binLocation,
                        description: item.description,
                        onHandQty: onHand,
                        orderedQty: remaining,
                        pickQty,
                        status: lineStatus,
                    };
                });

            if (!lines.length) continue; // fully invoiced — nothing left to pick

            const soStatus =
                lines.every(l => l.status === 'FULLY_FULFILLABLE') ? 'FULLY_FULFILLABLE'
                    : lines.some(l => l.pickQty > 0) ? 'PARTIALLY_FULFILLABLE'
                        : 'NOT_FULFILLABLE';

            const soEntry = {
                id: so.id,
                orderNumber: so.orderNumber,
                orderedAt: so.orderedAt,
                createdAt: so.createdAt,
                dispatchType: so.orderType,
                isOnSiteDispatch: so.orderType === 'WORKSHOP',
                status: soStatus,
                lines,
                unavailableCount: lines.filter(l => l.status !== 'FULLY_FULFILLABLE').length,
            };

            const custKey = so.customerId;
            if (!customerMap.has(custKey)) {
                customerMap.set(custKey, {
                    customerId: so.customer.id,
                    customerName: so.customer.name,
                    customerNumber: so.customer.customerNumber,
                    salesOrders: [],
                });
            }
            customerMap.get(custKey).salesOrders.push(soEntry);
        }

        const customers = Array.from(customerMap.values()).map((customer) => ({
            ...customer,
            salesOrders: [...customer.salesOrders].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    || String(a.orderNumber).localeCompare(String(b.orderNumber)),
            ),
        }));
        customers.sort((a, b) => {
            const aEntry = new Date(a.salesOrders[0]?.createdAt ?? 0).getTime();
            const bEntry = new Date(b.salesOrders[0]?.createdAt ?? 0).getTime();
            return aEntry - bEntry || String(a.customerName).localeCompare(String(b.customerName));
        });

        return { customers };
    } 

    async getBySalesOrder(salesOrderId: string) {
        const slips = await this.prisma.pickingSlip.findMany({
            where: { salesOrderId, deletedAt: null },
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
        });
        return slips;
    }

    private async generateSlipNumber(): Promise<string> {
        const prefix = 'PS';
        const startNum = 1001;

        const last = await this.prisma.pickingSlip.findFirst({
            where: { slipNumber: { startsWith: prefix + '-' } },
            orderBy: { slipNumber: 'desc' },
            select: { slipNumber: true },
        });

        if (!last) return `${prefix}-${startNum}`;
        const match = last.slipNumber.match(new RegExp(`${prefix}-(\\d+)`));
        const num = match ? parseInt(match[1], 10) : startNum - 1;
        return `${prefix}-${num + 1}`;
    }
}