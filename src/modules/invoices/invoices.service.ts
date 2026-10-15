import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma, InvoiceStatus, InvoiceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceItemsDto, ListInvoicesDto } from './dto/update-invoice.dto';
import { XeroInvoiceService } from '../xero/xero-invoice.service';
import { GraphMailService } from '../notifications/graph-mail.service';

@Injectable()
export class InvoicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mail: GraphMailService,
        private readonly xeroInvoice?: XeroInvoiceService,
    ) { }

    async list(dto: ListInvoicesDto) {
        const and: Prisma.InvoiceWhereInput[] = [{ deletedAt: null }];

        if (dto.salesOrderId) {
            and.push({ salesOrderId: dto.salesOrderId });
        }

        if (dto.search) {
            and.push({
                OR: [
                    { invoiceNumber: { contains: dto.search, mode: 'insensitive' } },
                    { customer: { name: { contains: dto.search, mode: 'insensitive' } } },
                ],
            });
        }

        if (dto.filter_status) {
            and.push({ status: { in: dto.filter_status.split(',') as InvoiceStatus[] } });
        }

        if (dto.filter_invoiceNumber) {
            and.push({ invoiceNumber: { in: dto.filter_invoiceNumber.split(',') } });
        }

        if (dto.filter_customer) {
            and.push({ customer: { name: { in: dto.filter_customer.split(',') } } });
        }

        const where: Prisma.InvoiceWhereInput = { AND: and };

        let orderBy: Prisma.InvoiceOrderByWithRelationInput = { createdAt: 'desc' };

        if (dto.sortKey) {
            const dir: Prisma.SortOrder = dto.sortDir === 'desc' ? 'desc' : 'asc';
            if (dto.sortKey === 'customer') {
                orderBy = { customer: { name: dir } };
            } else {
                orderBy = { [dto.sortKey]: dir } as Prisma.InvoiceOrderByWithRelationInput;
            }
        }

        const [items, total] = await this.prisma.$transaction([
            this.prisma.invoice.findMany({
                where: {
                    customerId: dto.customerId ?? undefined,
                    ...where
                },
                skip: dto.skip,
                take: dto.take,
                orderBy,
                include: {
                    customer: { select: { id: true, name: true, customerNumber: true, isGeneric: true, requiresShippingDetails: true } },
                    salesOrder: { select: { id: true, orderNumber: true, orderType: true } },
                    dispatch: { select: { id: true, method: true, accountNo: true, accountName: true } },
                    items: { where: { deletedAt: null } },
                    DispatchedInvoices: true
                },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return { items: items.map(item => ({ ...item, DispatchedInvoices: undefined, Dispatched: item.DispatchedInvoices.length > 0 })), total };
    }

    async findById(id: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, deletedAt: null },
            include: {
                customer: { select: { id: true, name: true, customerNumber: true, isGeneric: true, requiresShippingDetails: true } },
                salesOrder: { select: { id: true, orderNumber: true, orderType: true } },
                dispatch: { select: { id: true, method: true, accountNo: true, accountName: true } },
                items: {
                    where: { deletedAt: null },
                    include: { product: { select: { onHand: true } } },
                },
                subscriptionReport: true,
                fmSubscriptionItems: true
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');

        const uninvoicedByProduct = invoice.salesOrderId
            ? await this.uninvoicedQtyByProduct(invoice.salesOrderId, invoice.id)
            : new Map<string, number>();

        const soBackOrderByProduct = new Map<string, number[]>();
        if (invoice.salesOrderId) {
            const soLines = await this.prisma.salesOrderItem.findMany({
                where: { salesOrderId: invoice.salesOrderId, deletedAt: null },
                orderBy: { createdAt: 'asc' },
                select: { productId: true, backOrderQty: true },
            });
            for (const line of soLines) {
                const queue = soBackOrderByProduct.get(line.productId) ?? [];
                queue.push(Number(line.backOrderQty ?? 0));
                soBackOrderByProduct.set(line.productId, queue);
            }
        }

        return {
            ...invoice,
            items: invoice.items.map(item => {
                const queue = soBackOrderByProduct.get(item.productId);
                const soBackOrderQty = queue?.length ? queue.shift() : null;
                return {
                    ...item,
                    onHandQty: Number(item.product?.onHand ?? 0),
                    uninvoicedQty: invoice.salesOrderId
                        ? (uninvoicedByProduct.get(item.productId) ?? 0)
                        : null,
                    soBackOrderQty,
                };
            }),
        };
    }

    /** Sales-order quantity that is not yet on another invoice. */
    private async uninvoicedQtyByProduct(salesOrderId: string, excludeInvoiceId?: string) {
        const so = await this.prisma.salesOrder.findFirst({
            where: { id: salesOrderId, deletedAt: null },
            include: { items: { where: { deletedAt: null } } },
        });
        if (!so) return new Map<string, number>();

        const existingInvoices = await this.prisma.invoice.findMany({
            where: {
                salesOrderId,
                deletedAt: null,
                status: { not: 'CANCELLED' },
                ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}),
            },
            include: { items: { where: { deletedAt: null } } },
        });

        const invoicedQtyMap = new Map<string, number>();
        for (const inv of existingInvoices) {
            for (const item of inv.items) {
                invoicedQtyMap.set(
                    item.productId,
                    (invoicedQtyMap.get(item.productId) ?? 0) + Number(item.quantity),
                );
            }
        }

        const ordered = new Map<string, number>();
        for (const item of so.items) {
            ordered.set(item.productId, (ordered.get(item.productId) ?? 0) + Number(item.quantity));
        }

        const remaining = new Map<string, number>();
        for (const [productId, qty] of ordered) {
            remaining.set(productId, Math.max(0, qty - (invoicedQtyMap.get(productId) ?? 0)));
        }
        return remaining;
    }

    async create(dto: CreateInvoiceDto) {
        if (dto.invoiceType === 'REVERSAL') {
            if (!dto.reversalOfInvoiceId) {
                throw new BadRequestException('Choose the invoice to reverse before saving.');
            }
            await this.assertCanReverse(dto.reversalOfInvoiceId);
        }

        const resolvedStatus = dto.status ?? 'ISSUED';
        const isProforma = resolvedStatus === 'DRAFT';
        const invoiceNumber = await this.generateInvoiceNumber(isProforma);

        const invoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceType: (dto.invoiceType as InvoiceType) ?? InvoiceType.FREEHAND,
                isProforma,
                isLocked: resolvedStatus !== 'DRAFT',
                customerId: dto.customerId || null,
                //salesOrderId: dto.salesOrderId ?? null,
                salesOrderId: dto.salesOrderId || null,
                dispatchId: dto.dispatchId || null,
                status: resolvedStatus as InvoiceStatus,
                issuedAt: dto.issuedAt ?? null,
                dueDate: dto.dueDate ?? null,
                reference: dto.reference ?? null,
                freight: dto.freight ?? null,
                sundries: dto.sundries ?? null,
                labour: dto.labour ?? null,
                rounding: dto.rounding ?? null,
                otherCharges: dto.otherCharges ?? null,
                internalNotes: dto.internalNotes ?? null,
                externalNotes: dto.externalNotes ?? null,

                shippingName: dto.shippingName ?? null,
                shippingAddress1: dto.shippingAddress1 ?? null,
                shippingAddress2: dto.shippingAddress2 ?? null,
                shippingAddress3: dto.shippingAddress3 ?? null,
                shippingCity: dto.shippingCity ?? null,
                shippingState: dto.shippingState ?? null,
                shippingPostcode: dto.shippingPostcode ?? null,

                billingName: dto.billingName ?? null,
                billingAddress1: dto.billingAddress1 ?? null,
                billingAddress2: dto.billingAddress2 ?? null,
                billingAddress3: dto.billingAddress3 ?? null,
                billingCity: dto.billingCity ?? null,
                billingState: dto.billingState ?? null,
                billingPostcode: dto.billingPostcode ?? null,
            },
        });

        // Save items if provided
        if (dto.items?.length) {
            await this.validateAgainstCurrentStock(dto.items, invoice.invoiceType);
            await this.saveItems(invoice.id, dto.items);
        }

        if (dto.invoiceType === 'REVERSAL' && dto.reversalOfInvoiceId) {
            await this.prisma.invoice.update({
                where: { id: dto.reversalOfInvoiceId },
                data: { status: 'REVERSED', isLocked: true },
            });
        }

        return this.findById(invoice.id);
    }

    async update(id: string, dto: UpdateInvoiceDto) {
        const existing = await this.findById(id);
        let invoiceNumber = existing.invoiceNumber;
        let isProforma = existing.isProforma;

        if (existing.status === 'REVERSED' && dto.status && dto.status !== 'REVERSED') {
            throw new BadRequestException('A reversed invoice is locked.');
        }

        const wasLocked = existing.isLocked;

        // Once issued, the invoice becomes locked — only reference (PO), abnNumber,
        // and shipping address fields remain editable from here on.
        if (wasLocked) {
            return this.prisma.invoice.update({
                where: { id },
                data: {
                    ...(dto.status !== undefined && { status: dto.status as InvoiceStatus }),
                    ...(dto.reference !== undefined && { reference: dto.reference }),
                    ...(dto.abnNumber !== undefined && { abnNumber: dto.abnNumber }),
                    ...(dto.dispatchId !== undefined && { dispatchId: dto.dispatchId || null }),
                    ...(dto.shippingName !== undefined && { shippingName: dto.shippingName }),
                    ...(dto.shippingAddress1 !== undefined && { shippingAddress1: dto.shippingAddress1 }),
                    ...(dto.shippingAddress2 !== undefined && { shippingAddress2: dto.shippingAddress2 }),
                    ...(dto.shippingAddress3 !== undefined && { shippingAddress3: dto.shippingAddress3 }),
                    ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
                    ...(dto.shippingState !== undefined && { shippingState: dto.shippingState }),
                    ...(dto.shippingPostcode !== undefined && { shippingPostcode: dto.shippingPostcode }),
                },
            });
        }

        if (dto.status && dto.status !== 'DRAFT' && existing.isProforma) {
            invoiceNumber = await this.generateInvoiceNumber(false);
            isProforma = false;
        }

        // Becomes locked the moment it leaves DRAFT
        const willBeLocked = dto.status !== undefined && dto.status !== 'DRAFT';

        return this.prisma.invoice.update({
            where: { id },
            data: {
                invoiceNumber,
                isProforma,
                ...(willBeLocked && { isLocked: true }),
                ...(dto.status !== undefined && { status: dto.status as InvoiceStatus }),
                ...(dto.reference !== undefined && { reference: dto.reference }),
                ...(dto.abnNumber !== undefined && { abnNumber: dto.abnNumber }),
                ...(dto.dispatchId !== undefined && { dispatchId: dto.dispatchId || null }),
                ...(dto.issuedAt !== undefined && { issuedAt: dto.issuedAt }),
                ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
                ...(dto.freight !== undefined && { freight: dto.freight }),
                ...(dto.sundries !== undefined && { sundries: dto.sundries }),
                ...(dto.labour !== undefined && { labour: dto.labour }),
                ...(dto.rounding !== undefined && { rounding: dto.rounding }),
                ...(dto.otherCharges !== undefined && { otherCharges: dto.otherCharges }),
                ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
                ...(dto.externalNotes !== undefined && { externalNotes: dto.externalNotes }),

                ...(dto.shippingName !== undefined && { shippingName: dto.shippingName }),
                ...(dto.shippingAddress1 !== undefined && { shippingAddress1: dto.shippingAddress1 }),
                ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
                ...(dto.shippingState !== undefined && { shippingState: dto.shippingState }),
                ...(dto.shippingPostcode !== undefined && { shippingPostcode: dto.shippingPostcode }),

                ...(dto.billingName !== undefined && { billingName: dto.billingName }),
                ...(dto.billingAddress1 !== undefined && { billingAddress1: dto.billingAddress1 }),
                ...(dto.billingCity !== undefined && { billingCity: dto.billingCity }),
                ...(dto.billingState !== undefined && { billingState: dto.billingState }),
                ...(dto.billingPostcode !== undefined && { billingPostcode: dto.billingPostcode }),
            },
        });
    }

    async updateItems(id: string, dto: UpdateInvoiceItemsDto) {
        const invoice = await this.findById(id);

        if (invoice.status === 'REVERSED') {
            throw new BadRequestException('A reversed invoice is locked.');
        }

        await this.validateAgainstCurrentStock(dto.items, invoice.invoiceType);

        const creditInvoiceNumbers: string[] = [];

        // Auto-credit: only for already-issued invoices, and not for CREDIT/REVERSAL invoices themselves
        // Skipped entirely if the user declined the "Issue Credit Invoice NOW?" prompt on the frontend
        const skipAutoCreitTypes: InvoiceType[] = ['CREDIT', 'REVERSAL'];
        const wantsCredit = dto.issueCredit !== false; // default true if not specified
        if (wantsCredit && invoice.status !== 'DRAFT' && !skipAutoCreitTypes.includes(invoice.invoiceType)) {
            for (const newItem of dto.items) {
                if (!newItem.id) continue; // new line, not a reduction

                const oldItem = invoice.items.find(i => i.id === newItem.id);
                if (!oldItem) continue;

                const oldQty = Number(oldItem.quantity);
                const newQty = Number(newItem.quantity);

                if (newQty < oldQty) {
                    const diffQty = oldQty - newQty;
                    const credit = await this.createCreditInvoiceForReduction(invoice, oldItem, diffQty);
                    creditInvoiceNumbers.push(credit.invoiceNumber);
                }
            }
        }

        await this.saveItems(id, dto.items);
        const updated = await this.recalculateTotals(id);

        return { ...updated, creditInvoiceNumbers };
    }

    private async createCreditInvoiceForReduction(
        originalInvoice: { id: string; invoiceNumber: string; customerId: string | null; salesOrderId: string | null },
        item: { productId: string; description: string; unitPrice: Prisma.Decimal; discountPct: Prisma.Decimal | null },
        diffQty: number,
    ) {
        const invoiceNumber = await this.generateInvoiceNumber(false);

        const creditInvoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceType: 'CREDIT',
                isProforma: false,
                customerId: originalInvoice.customerId,
                salesOrderId: originalInvoice.salesOrderId,
                status: 'ISSUED',
                issuedAt: new Date(),
                reference: originalInvoice.invoiceNumber,
                internalNotes: `Auto-generated credit for reduction on ${originalInvoice.invoiceNumber}`,
            },
        });

        await this.saveItems(creditInvoice.id, [
            {
                productId: item.productId,
                description: item.description,
                quantity: -diffQty,
                unitPrice: Number(item.unitPrice),
                discountPct: Number(item.discountPct ?? 0),
            },
        ]);

        return creditInvoice;
    }

    async softDelete(id: string) {
        await this.findById(id);
        await this.prisma.invoice.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return { success: true };
    }

    // Create invoice from SO — pulls uninvoiced items
    async createFromSalesOrder(salesOrderId: string) {
        const so = await this.prisma.salesOrder.findFirst({
            where: { id: salesOrderId, deletedAt: null },
            include: { items: { where: { deletedAt: null } } },
        });

        if (!so) throw new NotFoundException('Sales order not found');

        const defaultDispatch = await this.prisma.customerDispatch.findFirst({
            where: { customerId: so.customerId, deletedAt: null, isDefault: true },
        });

        // Find already invoiced quantities per product
        const existingInvoices = await this.prisma.invoice.findMany({
            where: { salesOrderId, deletedAt: null, status: { not: 'CANCELLED' } },
            include: { items: { where: { deletedAt: null } } },
        });

        // Build map: productId → total already invoiced qty
        const invoicedQtyMap = new Map<string, number>();
        for (const inv of existingInvoices) {
            for (const item of inv.items) {
                const current = invoicedQtyMap.get(item.productId) ?? 0;
                invoicedQtyMap.set(item.productId, current + item.quantity);
            }
        }

        // Only include items with remaining qty
        const uninvoicedItems = so.items
            .map(item => {
                const invoiced = invoicedQtyMap.get(item.productId) ?? 0;
                const remaining = item.quantity - invoiced;
                return { ...item, remainingQty: remaining };
            })
            .filter(item => item.remainingQty > 0);

        const invoiceNumber = await this.generateInvoiceNumber(true);

        const invoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                customerId: so.customerId,
                salesOrderId: so.id,
                dispatchId: defaultDispatch?.id ?? null,
                status: 'DRAFT',
                freight: so.freight ?? null,
                sundries: so.sundries ?? null,
                labour: so.labour ?? null,
                rounding: so.rounding ?? null,

                shippingName: so.shippingName ?? null,
                shippingAddress1: so.shippingAddress1 ?? null,
                shippingAddress2: so.shippingAddress2 ?? null,
                shippingAddress3: so.shippingAddress3 ?? null,
                shippingCity: so.shippingCity ?? null,
                shippingState: so.shippingState ?? null,
                shippingPostcode: so.shippingPostcode ?? null,

                billingName: so.billingName ?? null,
                billingAddress1: so.billingAddress1 ?? null,
                billingAddress2: so.billingAddress2 ?? null,
                billingAddress3: so.billingAddress3 ?? null,
                billingCity: so.billingCity ?? null,
                billingState: so.billingState ?? null,
                billingPostcode: so.billingPostcode ?? null,
            },
        });

        // Save uninvoiced items
        if (uninvoicedItems.length) {
            await this.saveItems(
                invoice.id,
                uninvoicedItems.map(item => ({
                    productId: item.productId,
                    description: item.description,
                    quantity: item.remainingQty,
                    unitPrice: Number(item.unitPrice),
                    discountPct: Number(item.discountPct ?? 0),
                })),
            );
        }

        return this.findById(invoice.id);
    }

    private async validateAgainstCurrentStock(
        items: { productId: string; quantity: number }[],
        invoiceType: string,
    ) {
        // Credit/Reversal lines carry negative quantities to reverse a prior
        // stock deduction — they don't represent new physical stock being sold.
        if (invoiceType === 'CREDIT' || invoiceType === 'REVERSAL') return;

        const positiveItems = items.filter(i => Number(i.quantity) > 0);
        if (!positiveItems.length) return;

        const productIds = [...new Set(positiveItems.map(i => i.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, productCode: true, onHand: true },
        });

        const byId = new Map(products.map(p => [p.id, p]));

        for (const item of positiveItems) {
            const product = byId.get(item.productId);
            const onHand = Number(product?.onHand ?? 0);
            const requestedQty = Number(item.quantity);
            const code = product?.productCode ?? item.productId;

            if (onHand <= 0) {
                throw new BadRequestException(
                    `"${code}" has 0 units in Current Stock — cannot invoice this item.`,
                );
            }

            if (requestedQty > onHand) {
                throw new BadRequestException(
                    `"${code}": requested qty (${requestedQty}) exceeds Current Stock (${onHand}). Committed/Available stock does not block invoicing — only physical Current Stock does.`,
                );
            }
        }
    }

    private async saveItems(invoiceId: string, items: any[]) {
        const cleanItems = items.map(i => ({
            id: i.id,
            productId: i.productId,
            description: i.description,
            quantity: Number(i.quantity),
            backorderQty: Number(i.backorderQty ?? 0),
            unitPrice: Number(i.unitPrice),
            discountPct: Number(i.discountPct ?? 0),
            lineTotal:
                Number(i.quantity) *
                Number(i.unitPrice) *
                (1 - Number(i.discountPct ?? 0) / 100),
        }));

        const keepIds = cleanItems.map(i => i.id).filter(Boolean) as string[];

        await this.prisma.$transaction(async tx => {
            // Soft-delete removed items
            if (keepIds.length > 0) {
                await tx.invoiceItem.updateMany({
                    where: { invoiceId, deletedAt: null, id: { notIn: keepIds } },
                    data: { deletedAt: new Date() },
                });
            } else {
                await tx.invoiceItem.updateMany({
                    where: { invoiceId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            }

            for (const item of cleanItems) {
                await tx.invoiceItem.upsert({
                    where: { id: item.id ?? '__new__' },
                    create: {
                        invoiceId,
                        productId: item.productId,
                        description: item.description,
                        quantity: item.quantity,
                        backorderQty: item.backorderQty,
                        unitPrice: item.unitPrice,
                        discountPct: item.discountPct,
                        lineTotal: item.lineTotal,
                    },
                    update: {
                        productId: item.productId,
                        description: item.description,
                        quantity: item.quantity,
                        backorderQty: item.backorderQty,
                        unitPrice: item.unitPrice,
                        discountPct: item.discountPct,
                        lineTotal: item.lineTotal,
                        deletedAt: null,
                    },
                });
            }
        });

        return this.recalculateTotals(invoiceId);
    }

    private async recalculateTotals(invoiceId: string) {
        const items = await this.prisma.invoiceItem.findMany({
            where: { invoiceId, deletedAt: null },
        });

        const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });

        const parts = items.reduce((s, i) => s + Number(i.lineTotal ?? 0), 0);
        const subtotal = parts + Number(invoice?.freight ?? 0) + Number(invoice?.sundries ?? 0) + Number(invoice?.labour ?? 0) + Number(invoice?.otherCharges ?? 0);
        const gst = subtotal * 0.1;
        const total = subtotal + gst + Number(invoice?.rounding ?? 0);

        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                subtotal,
                gst,
                total,
                balanceDue: total - Number(invoice?.paidAmount ?? 0),
            },
        });
    }

    async getUninvoicedItems(salesOrderId: string) {
        const so = await this.prisma.salesOrder.findFirst({
            where: { id: salesOrderId, deletedAt: null },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        customerNumber: true,
                        isGeneric: true,
                        requiresShippingDetails: true,
                        abn: true,
                    },
                },
                items: {
                    where: { deletedAt: null },
                    include: { product: { select: { onHand: true } } },
                },
            },
        });

        if (!so) throw new NotFoundException('Sales order not found');

        // Already invoiced qty per product
        const existingInvoices = await this.prisma.invoice.findMany({
            where: { salesOrderId, deletedAt: null, status: { not: 'CANCELLED' } },
            include: { items: { where: { deletedAt: null } } },
        });

        const invoicedQtyMap = new Map<string, number>();
        for (const inv of existingInvoices) {
            for (const item of inv.items) {
                const current = invoicedQtyMap.get(item.productId) ?? 0;
                invoicedQtyMap.set(item.productId, current + item.quantity);
            }
        }

        // Product total still not on an invoice. Duplicate sales-order lines
        // share that total; `quantity` is only this line's own remainder.
        const ordered = new Map<string, number>();
        for (const item of so.items) {
            ordered.set(item.productId, (ordered.get(item.productId) ?? 0) + Number(item.quantity));
        }
        const productRemaining = new Map<string, number>();
        for (const [productId, qty] of ordered) {
            productRemaining.set(productId, Math.max(0, qty - (invoicedQtyMap.get(productId) ?? 0)));
        }

        const invoicedLeft = new Map(invoicedQtyMap);
        const uninvoicedItems = so.items
            .map(item => {
                const lineQty = Number(item.quantity);
                const used = Math.min(lineQty, invoicedLeft.get(item.productId) ?? 0);
                invoicedLeft.set(item.productId, (invoicedLeft.get(item.productId) ?? 0) - used);
                return {
                    productId: item.productId,
                    description: item.description,
                    quantity: lineQty - used,
                    uninvoicedQty: productRemaining.get(item.productId) ?? 0,
                    backOrderQty: Number(item.backOrderQty ?? 0),
                    onHandQty: Number(item.product?.onHand ?? 0),
                    unitPrice: Number(item.unitPrice),
                    discountPct: Number(item.discountPct ?? 0),
                };
            })
            .filter(item => item.quantity > 0);

        return {
            so,
            uninvoicedItems,
            hasUninvoiced: uninvoicedItems.length > 0,
        };
    }

    private async generateInvoiceNumber(isProforma: boolean): Promise<string> {
        const prefix = isProforma ? 'PINV' : 'INV';
        const startNum = isProforma ? 7001 : 7001;

        const last = await this.prisma.invoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix + '-' } },
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
        });

        if (!last) return `${prefix}-${startNum}`;
        const match = last.invoiceNumber.match(new RegExp(`${prefix}-(\\d+)`));
        const num = match ? parseInt(match[1], 10) : startNum - 1;
        return `${prefix}-${num + 1}`;
    }

    async validateItemQtyAgainstParent(
        invoiceId: string | null,
        invoiceType: string,
        parentId: string,
        items: { productId: string; quantity: number; backorderQty: number }[],
    ) {
        if (!['SALESORDER', 'JOBBOOK', 'CREDIT', 'REVERSAL', 'SUBSCRIPTION'].includes(invoiceType)) {
            return; // FREEHAND — no validation
        }

        if (invoiceType === 'SALESORDER' && parentId) {
            const so = await this.prisma.salesOrder.findFirst({
                where: { id: parentId },
                include: { items: { where: { deletedAt: null } } },
            });
            if (!so) return;

            // Already invoiced qty (excluding current invoice)
            const existingInvoices = await this.prisma.invoice.findMany({
                where: {
                    salesOrderId: parentId,
                    deletedAt: null,
                    status: { not: 'CANCELLED' },
                    ...(invoiceId ? { id: { not: invoiceId } } : {}),
                },
                include: { items: { where: { deletedAt: null } } },
            });

            const invoicedQtyMap = new Map<string, number>();
            for (const inv of existingInvoices) {
                for (const item of inv.items) {
                    invoicedQtyMap.set(item.productId, (invoicedQtyMap.get(item.productId) ?? 0) + item.quantity);
                }
            }

            // Validate each item
            for (const item of items) {
                const soItem = so.items.find(i => i.productId === item.productId);
                if (!soItem) continue;

                const alreadyInvoiced = invoicedQtyMap.get(item.productId) ?? 0;
                const available = soItem.quantity - alreadyInvoiced;

                if (item.quantity > available) {
                    throw new BadRequestException(
                        `Item "${item.productId}": requested qty ${item.quantity} exceeds available uninvoiced qty ${available}`
                    );
                }
            }
        }
    }

    /** One reversal per invoice. A second attempt is rejected. */
    private async assertCanReverse(invoiceId: string) {
        const original = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, deletedAt: null },
            select: { id: true, invoiceNumber: true, invoiceType: true, status: true },
        });
        if (!original) throw new NotFoundException('Invoice not found');

        if (original.invoiceType === 'REVERSAL') {
            throw new BadRequestException(`Invoice "${original.invoiceNumber}" is itself a reversal and cannot be reversed.`);
        }
        if (original.status === 'CANCELLED') {
            throw new BadRequestException(`Invoice "${original.invoiceNumber}" is cancelled and cannot be reversed.`);
        }
        if (original.status === 'REVERSED') {
            throw new BadRequestException(`Invoice "${original.invoiceNumber}" has already been reversed.`);
        }

        const existing = await this.prisma.invoice.findFirst({
            where: { reversalOfInvoiceId: original.id, deletedAt: null, status: { not: 'CANCELLED' } },
            select: { id: true },
        });
        if (existing) {
            throw new BadRequestException(`Invoice "${original.invoiceNumber}" has already been reversed.`);
        }
    }

    async getInvoiceForCredit(invoiceNumber: string) {
        const original = await this.prisma.invoice.findFirst({
            where: { invoiceNumber, deletedAt: null },
            include: {
                customer: { select: { id: true, name: true, customerNumber: true } },
                items: { where: { deletedAt: null } },
            },
        });

        if (!original) return { invoice: null, creditItems: [] };

        if (original.status === 'CANCELLED') {
            throw new BadRequestException(`Invoice "${invoiceNumber}" is cancelled and cannot be credited.`);
        }
        if (original.invoiceType === 'CREDIT') {
            throw new BadRequestException(`Invoice "${invoiceNumber}" is already a credit invoice.`);
        }

        const creditItems = original.items
            .filter(item => Number(item.quantity) > 0)
            .map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: -Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                discountPct: Number(item.discountPct ?? 0),
            }));

        if (!creditItems.length) {
            throw new BadRequestException(`Invoice "${invoiceNumber}" has no quantities to credit.`);
        }

        return { invoice: original, creditItems };
    }

    async getInvoiceForReversal(invoiceNumber: string) {
        const original = await this.prisma.invoice.findFirst({
            where: { invoiceNumber, deletedAt: null },
            include: {
                customer: { select: { id: true, name: true, customerNumber: true } },
                items: { where: { deletedAt: null } },
            },
        });

        if (!original) {
            return { invoice: null, hasReversal: false };
        }

        await this.assertCanReverse(original.id);

        // Sum how much of each product has already been reversed across any
        // prior (non-cancelled) reversal invoices against this same original.
        const priorReversals = await this.prisma.invoice.findMany({
            where: { reversalOfInvoiceId: original.id, deletedAt: null, status: { not: 'CANCELLED' } },
            include: { items: { where: { deletedAt: null } } },
        });

        const reversedQtyMap = new Map<string, number>();
        for (const rev of priorReversals) {
            for (const item of rev.items) {
                reversedQtyMap.set(item.productId, (reversedQtyMap.get(item.productId) ?? 0) + Math.abs(Number(item.quantity)));
            }
        }

        // Aggregate the ORIGINAL invoice's lines by productId first. The
        // original invoice can legitimately have the same product split
        // across multiple lines (e.g. added twice, or price/discount
        // variations) — comparing "already reversed" per raw line instead of
        // per product would double-subtract the same reversed amount once
        // per duplicate line. Summing to one total-per-product before
        // subtracting fixes that.
        const originalByProduct = new Map<string, { description: string; quantity: number; unitPrice: number; discountPct: number }>();
        for (const i of original.items) {
            const existing = originalByProduct.get(i.productId);
            if (existing) {
                existing.quantity += Number(i.quantity);
            } else {
                originalByProduct.set(i.productId, {
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    discountPct: Number(i.discountPct ?? 0),
                });
            }
        }

        const reversalItems: { productId: string; description: string; quantity: number; unitPrice: number; discountPct: number }[] = [];
        for (const [productId, agg] of originalByProduct.entries()) {
            const alreadyReversed = reversedQtyMap.get(productId) ?? 0;
            const remaining = agg.quantity - alreadyReversed;
            if (remaining > 0) {
                reversalItems.push({
                    productId,
                    description: agg.description,
                    quantity: -remaining,
                    unitPrice: agg.unitPrice,
                    discountPct: agg.discountPct,
                });
            }
        }

        if (!reversalItems.length) {
            throw new BadRequestException(`Invoice "${invoiceNumber}" has already been fully reversed.`);
        }

        return {
            invoice: original,
            reversalItems,
            hasReversal: true,
        };
    }

    async getUninvoicedItemsByNumber(orderNumber: string) {
        const so = await this.prisma.salesOrder.findFirst({
            where: { orderNumber, deletedAt: null },
            include: { items: { where: { deletedAt: null } } },
        });

        if (!so) return { so: null, uninvoicedItems: [], hasUninvoiced: false };

        // Reuse existing logic
        return this.getUninvoicedItems(so.id);
    }

    async createFromPreinstall(preinstallId: string) { //Not Using this
        // 1. Preinstall fetch
        const preinstall = await this.prisma.fMPreinstall.findFirst({
            where: { id: preinstallId, deletedAt: null },
            include: {
                customer: true,
                fmCustomer: true,
                installDetail: true,
                items: { where: { deletedAt: null } },
            },
        });

        if (!preinstall) throw new NotFoundException('Preinstall not found');

        // 2. Only INSTALLED status can be invoiced
        if (preinstall.status !== 'INSTALLED') {
            throw new BadRequestException(
                `Cannot invoice preinstall with status ${preinstall.status}. Must be INSTALLED.`
            );
        }

        // 3. Already invoiced check
        if (preinstall.invoiceId) {
            throw new BadRequestException('Preinstall already has an invoice');
        }

        const d = preinstall.installDetail;

        // 4. Build externalNotes from install detail (text entry field)
        const notes = [
            `Install Type: ${d?.installType ?? '-'}`,
            `Unit Type: ${d?.fmUnitType ?? '-'} | Unit Code: ${d?.fmUnitCode ?? '-'}`,
            `Service Code: ${d?.serviceCode ?? '-'} | MIX Code: ${d?.mixCode ?? '-'}`,
            ``,
            `Vehicle: ${d?.vehicleMake ?? '-'} ${d?.vehicleModel ?? '-'} ${d?.yearVariant ?? ''}`.trim(),
            `Rego: ${d?.regoNumber ?? '-'} | VIN: ${d?.vinNumber ?? '-'}`,
            `Asset No: ${d?.assetNumber ?? '-'} | Fleet No: ${d?.fleetNumber ?? '-'}`,
            ``,
            `Unit Serial: ${d?.unitSerial ?? '-'}`,
            `Unit IMEI: ${d?.unitIMEI ?? '-'}`,
            `Unit SIM: ${d?.unitSim ?? '-'}`,
            ...(d?.visionType ? [
                `Vision Type: ${d.visionType}`,
                `Vis 1 Serial: ${d.vis1Serial ?? '-'}`,
                `Vis IMEI: ${d.visIMEI ?? '-'}`,
                ...((d?.cameraCount ?? 0) >= 2 ? [`Vis 2 Serial: ${d.vis2Serial ?? '-'}`] : []),
                ...((d?.cameraCount ?? 0) >= 3 ? [`Vis 3 Serial: ${d.vis3Serial ?? '-'}`] : []),
                ...((d?.cameraCount ?? 0) >= 4 ? [`Vis 4 Serial: ${d.vis4Serial ?? '-'}`] : []),
            ] : []),
            ``,
            `Location: ${d?.installLocation ?? '-'}`,
            `Installer: ${d?.installer ?? '-'}`,
            `Install Date: ${d?.installDate ? new Date(d.installDate).toLocaleDateString('en-AU') : '-'}`,
            `MIX Org ID: ${d?.mixOrgId ?? '-'}`,
        ].join('\n');

        // 5. Create invoice
        const invoiceNumber = await this.generateInvoiceNumber(true); // proforma first

        const invoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceType: 'FMPREINSTALL',
                isProforma: true,
                customerId: preinstall.customerId,
                status: 'DRAFT',
                externalNotes: notes,
                internalNotes: `FMPreinstall: ${preinstall.preinstallNo}`,

                // Charges from preinstall
                labour: preinstall.chargeLabour ?? null,
                freight: preinstall.chargeFreight ?? null,
                sundries: preinstall.chargeSundries ?? null,
                rounding: preinstall.chargeRounding ?? null,

                // Billing address
                billingName: preinstall.billingName ?? null,
                billingAddress1: preinstall.billingAddress1 ?? null,
                billingAddress2: preinstall.billingAddress2 ?? null,

                // Shipping address
                shippingName: preinstall.shippingName ?? null,
                shippingAddress1: preinstall.shippingAddress1 ?? null,
                shippingAddress2: preinstall.shippingAddress2 ?? null,
            },
        });

        // 6. Add preinstall items (hardware parts) as invoice items
        if (preinstall.items.length) {
            await this.saveItems(
                invoice.id,
                preinstall.items.map(item => ({
                    productId: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    discountPct: Number(item.discountPct ?? 0),
                })),
            );
        }

        // 7. Update preinstall — link invoice + status INVOICED
        await this.prisma.fMPreinstall.update({
            where: { id: preinstallId },
            data: {
                invoiceId: invoice.id,
                status: 'INVOICED',
            },
        });

        return this.findById(invoice.id);
    }

    async getPreinstallInvoiceData(preinstallId: string) {
        const preinstall = await this.prisma.fMPreinstall.findFirst({
            where: { id: preinstallId, deletedAt: null },
            include: {
                customer: true,
                fmCustomer: true,
                installDetail: true,
                items: { where: { deletedAt: null } },
            },
        });

        if (!preinstall) throw new NotFoundException('Preinstall not found');

        if (preinstall.status !== 'INSTALLED' && preinstall.status !== 'WAITING_INSTALL') {
            throw new BadRequestException(
                `Status ${preinstall.status} — only INSTALLED can be invoiced`
            );
        }

        if (preinstall.invoiceId) {
            throw new BadRequestException('Already invoiced');
        }

        const d = preinstall.installDetail;

        const notes = [
            //`Install Type: ${d?.installType ?? '-'}`,
            //`Unit Type: ${d?.fmUnitType ?? '-'} | Unit Code: ${d?.fmUnitCode ?? '-'}`,
            //`Service Code: ${d?.serviceCode ?? '-'} | MIX Code: ${d?.mixCode ?? '-'}`,
            //``,
            `Vehicle: ${[d?.vehicleMake, d?.vehicleModel, d?.yearVariant].filter(Boolean).join(' ')}`,
            `Rego: ${d?.regoNumber ?? '-'} | VIN: ${d?.vinNumber ?? '-'}`,
            `Asset No: ${d?.assetNumber ?? '-'} | Fleet No: ${d?.fleetNumber ?? '-'}`,
            ``,
            `Unit Serial: ${d?.unitSerial ?? '-'}`,
            `Unit IMEI: ${d?.unitIMEI ?? '-'}`,
            `Unit SIM: ${d?.unitSim ?? '-'}`,
            ...(d?.visionType ? [
                ``,
                `Vision: ${d.visionType}`,
                `Vis 1 Serial: ${d.vis1Serial ?? '-'}`,
                `Vis IMEI: ${d.visIMEI ?? '-'}`,
                ...((d?.cameraCount ?? 0) >= 2 ? [`Vis 2 Serial: ${d.vis2Serial ?? '-'}`] : []),
                ...((d?.cameraCount ?? 0) >= 3 ? [`Vis 3 Serial: ${d.vis3Serial ?? '-'}`] : []),
                ...((d?.cameraCount ?? 0) >= 4 ? [`Vis 4 Serial: ${d.vis4Serial ?? '-'}`] : []),
            ] : []),
            ``,
            `Location: ${d?.installLocation ?? '-'}`,
            `Installer: ${d?.installer ?? '-'}`,
            `Install Date: ${d?.installDate ? new Date(d.installDate).toLocaleDateString('en-AU') : '-'}`,
            //`MIX Org ID: ${d?.mixOrgId ?? '-'}`,
        ].join('\n');

        // Return pre-populated invoice data only — no DB write
        return {
            preinstallId: preinstall.id,
            preinstallNo: preinstall.preinstallNo,
            customerId: preinstall.customerId,
            customerName: preinstall.customer?.name,
            invoiceType: 'FMPREINSTALL',
            externalNotes: notes,
            internalNotes: `FMPreinstall: ${preinstall.preinstallNo}`,
            labour: preinstall.chargeLabour ?? null,
            freight: preinstall.chargeFreight ?? null,
            sundries: preinstall.chargeSundries ?? null,
            rounding: preinstall.chargeRounding ?? null,
            billingName: preinstall.billingName ?? null,
            billingAddress1: preinstall.billingAddress1 ?? null,
            billingAddress2: preinstall.billingAddress2 ?? null,
            shippingName: preinstall.shippingName ?? null,
            shippingAddress1: preinstall.shippingAddress1 ?? null,
            shippingAddress2: preinstall.shippingAddress2 ?? null,
            items: preinstall.items.map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                discountPct: Number(item.discountPct ?? 0),
                partNumber: item.partNumber,
            })),
        };
    }

    // Invoice save after preinstall update with separate method
    async emailInvoicePdf(invoiceId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, deletedAt: null },
            include: {
                customer: { include: { contacts: { where: { deletedAt: null } } } },
                items: { where: { deletedAt: null } },
                fmSubscriptionItems: true,
            },
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (!invoice.customer) throw new BadRequestException('This invoice has no customer to email.');

        const contacts = invoice.customer.contacts.filter(contact => contact.email?.trim());
        const contact = contacts.find(item => item.role === 'INVOICE')
            ?? contacts.find(item => item.category === 'ACCOUNT')
            ?? contacts.find(item => item.isPrimary)
            ?? contacts[0];
        if (!contact?.email) {
            throw new BadRequestException('This customer has no email address for invoices.');
        }

        const pdf = await this.buildInvoicePdf(invoice);
        try {
            await this.mail.sendMail({
                to: contact.email,
                subject: `Invoice ${invoice.invoiceNumber}`,
                html: `<p>Please find invoice ${invoice.invoiceNumber} attached as a PDF.</p>`,
                attachments: [{
                    name: `${invoice.invoiceNumber}.pdf`,
                    contentType: 'application/pdf',
                    contentBytes: pdf.toString('base64'),
                }],
            });
        } catch (err: any) {
            throw new BadRequestException(err?.message || 'Could not email the invoice.');
        }

        return { emailedTo: contact.email };
    }

    private buildInvoicePdf(invoice: any): Promise<Buffer> {
        const PDFDocument = require('pdfkit');
        const money = (n: number) =>
            `$${Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const fmtDate = (value?: string | Date | null) =>
            value ? new Date(value).toLocaleDateString('en-AU') : '—';
        const logoPath = path.resolve(__dirname, '../../../assets/logo.png');

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageW = 595;
            const pageH = 842;
            const margin = 36;
            const contentW = pageW - margin * 2;
            const navy = '#1d4ed8';

            doc.rect(0, 0, pageW, 92).fill(navy);
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin, 18, { height: 52 });
            } else {
                doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
                    .text('AIRCO', margin, 28);
            }
            doc.fillColor('#dbeafe').font('Helvetica').fontSize(9)
                .text('INVOICE', pageW - 210, 22, { width: 170, align: 'right' });
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
                .text(invoice.invoiceNumber, pageW - 210, 38, { width: 170, align: 'right' });
            doc.fillColor('#dbeafe').font('Helvetica').fontSize(9)
                .text(String(invoice.status ?? '').replace(/_/g, ' '), pageW - 210, 62, { width: 170, align: 'right' });

            const billLines = [
                invoice.billingName || invoice.customer?.name || '',
                invoice.billingAddress1,
                [invoice.billingCity, invoice.billingState, invoice.billingPostcode].filter(Boolean).join(' '),
            ].filter(Boolean);
            const shipLines = [
                invoice.shippingName,
                invoice.shippingAddress1,
                [invoice.shippingCity, invoice.shippingState, invoice.shippingPostcode].filter(Boolean).join(' '),
            ].filter(Boolean);

            let y = 110;
            const colW = 175;
            const drawBlock = (title: string, lines: string[], x: number) => {
                doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8)
                    .text(title, x, y, { width: colW });
                doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
                lines.slice(0, 4).forEach((line, index) => {
                    doc.font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
                        .text(line, x, y + 14 + index * 13, { width: colW });
                });
            };
            drawBlock('BILL TO', billLines.length ? billLines : ['—'], margin);
            drawBlock('SHIP TO', shipLines.length ? shipLines : ['—'], margin + colW + 8);
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8)
                .text('ISSUE DATE', margin + (colW + 8) * 2, y);
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
                .text(fmtDate(invoice.issuedAt), margin + (colW + 8) * 2, y + 14);
            doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8)
                .text('DUE DATE', margin + (colW + 8) * 2, y + 36);
            doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(10)
                .text(fmtDate(invoice.dueDate), margin + (colW + 8) * 2, y + 50);
            if (invoice.reference) {
                doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8)
                    .text('REFERENCE', margin + (colW + 8) * 2, y + 72);
                doc.fillColor('#0f172a').font('Helvetica').fontSize(10)
                    .text(String(invoice.reference), margin + (colW + 8) * 2, y + 86, { width: colW });
            }

            y = 230;
            doc.moveTo(margin, y).lineTo(pageW - margin, y).strokeColor(navy).lineWidth(2).stroke();
            y += 16;

            const lines = (invoice.items?.length ? invoice.items : invoice.fmSubscriptionItems ?? []).map((item: any) => ({
                label: item.description || item.label || 'Item',
                qty: Number(item.quantity ?? 0),
                price: Number(item.unitPrice ?? item.rate ?? 0),
                total: Number(item.lineTotal ?? item.total ?? (Number(item.quantity ?? 0) * Number(item.unitPrice ?? item.rate ?? 0))),
            }));

            const cols = {
                desc: { x: margin + 8, w: 270 },
                qty: { x: margin + 278, w: 50 },
                price: { x: margin + 332, w: 80 },
                total: { x: margin + 416, w: 90 },
            };
            doc.rect(margin, y, contentW, 22).fill(navy);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
            doc.text('DESCRIPTION', cols.desc.x, y + 7, { width: cols.desc.w });
            doc.text('QTY', cols.qty.x, y + 7, { width: cols.qty.w, align: 'right' });
            doc.text('UNIT PRICE', cols.price.x, y + 7, { width: cols.price.w, align: 'right' });
            doc.text('LINE TOTAL', cols.total.x, y + 7, { width: cols.total.w, align: 'right' });
            y += 22;

            if (!lines.length) {
                doc.rect(margin, y, contentW, 28).fill('#f8fafc');
                doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
                    .text('No line items', margin, y + 9, { width: contentW, align: 'center' });
                y += 28;
            } else {
                lines.forEach((line, index) => {
                    const bg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
                    doc.rect(margin, y, contentW, 22).fill(bg);
                    doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
                    doc.text(line.label, cols.desc.x, y + 6, { width: cols.desc.w, lineBreak: false });
                    doc.text(String(line.qty), cols.qty.x, y + 6, { width: cols.qty.w, align: 'right', lineBreak: false });
                    doc.text(money(line.price), cols.price.x, y + 6, { width: cols.price.w, align: 'right', lineBreak: false });
                    doc.font('Helvetica-Bold')
                        .text(money(line.total), cols.total.x, y + 6, { width: cols.total.w, align: 'right', lineBreak: false });
                    y += 22;
                });
            }

            y += 16;
            const totals: [string, string, boolean][] = [
                ['Freight', money(Number(invoice.freight ?? 0)), false],
                ['Sundries', money(Number(invoice.sundries ?? 0)), false],
                ['Labour', money(Number(invoice.labour ?? 0)), false],
                ['GST (10%)', money(Number(invoice.gst ?? 0)), false],
                ['TOTAL', money(Number(invoice.total ?? 0)), true],
            ];
            const boxX = pageW - margin - 220;
            totals.forEach(([label, value, bold]) => {
                if (bold) {
                    doc.moveTo(boxX, y).lineTo(pageW - margin, y).strokeColor(navy).lineWidth(1.5).stroke();
                    y += 6;
                }
                doc.fillColor(bold ? navy : '#475569').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10)
                    .text(label, boxX, y, { width: 100 });
                doc.text(value, boxX + 100, y, { width: 110, align: 'right' });
                y += bold ? 22 : 16;
            });

            if (invoice.externalNotes) {
                y += 8;
                doc.rect(margin, y, 4, 36).fill(navy);
                doc.rect(margin + 4, y, contentW - 230, 36).fill('#f8fafc');
                doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8)
                    .text('NOTES', margin + 14, y + 6);
                doc.fillColor('#334155').font('Helvetica').fontSize(9)
                    .text(String(invoice.externalNotes), margin + 14, y + 18, { width: contentW - 260 });
            }

            doc.rect(0, pageH - 42, pageW, 42).fill('#0f172a');
            doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8)
                .text('Airco  |  ABN 20 866 548 229  |  Unit 33 / 105A Vanessa Street, Kingsgrove NSW 2208', 0, pageH - 28, { width: pageW, align: 'center' });
            doc.fillColor('#94a3b8')
                .text('(02) 9560 2755  |  info@airco.com.au  |  www.airco.com.au', 0, pageH - 16, { width: pageW, align: 'center' });

            doc.end();
        });
    }

    async linkPreinstallInvoice(preinstallId: string, invoiceId: string) {
        await this.prisma.fMPreinstall.update({
            where: { id: preinstallId },
            data: {
                invoiceId,
                status: 'INVOICED',
            },
        });
    }

}