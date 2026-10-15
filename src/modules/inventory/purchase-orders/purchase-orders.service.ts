import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/create-po.dto';
import { CreateGrnDto } from './dto/create-grn.dto';
import { GraphMailService } from '../../notifications/graph-mail.service';
import PDFDocument from 'pdfkit';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PurchaseOrdersService {
    constructor(private readonly prisma: PrismaService, private readonly mailService: GraphMailService,) { }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private get db() {
        return this.prisma as any;
    }

    private async audit(
        actorId: string | undefined,
        action: string,
        entityType: string,
        entityId: string,
        metadata: Record<string, any>,
    ) {
        await this.db.auditLog.create({
            data: {
                actorId: actorId ?? null,
                actorType: 'USER',
                action,
                entityType,
                entityId,
                metadata,
            },
        });
    }

    private async recalcPoTotals(poId: string) {
        const lines = await this.db.purchaseOrderLine.findMany({
            where: { purchaseOrderId: poId },
        });
        const subtotal = lines.reduce((s: number, l: any) => s + Number(l.lineTotal ?? 0), 0);
        const gst = +(subtotal * 0.1).toFixed(2);
        const total = +(subtotal + gst).toFixed(2);
        await this.db.purchaseOrder.update({
            where: { id: poId },
            data: { subtotal, gst, total },
        });
    }

    private async generatePoNumber(): Promise<string> {
        const last = await this.db.purchaseOrder.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { orderNumber: true },
        });
        const num = last ? parseInt(last.orderNumber.replace('PO-', ''), 10) + 1 : 1001;
        return `PO-${String(num).padStart(4, '0')}`;
    }

    private async generateGrnNumber(): Promise<string> {
        const last = await this.db.goodsReceipt.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { receiptNumber: true },
        });
        const num = last ? parseInt(last.receiptNumber.replace('GRN-', ''), 10) + 1 : 1001;
        return `GRN-${String(num).padStart(4, '0')}`;
    }

    // ── List ──────────────────────────────────────────────────────────────────

    async list(query: {
        supplierId?: string;
        status?: string;
        skip?: number;
        take?: number;
    }) {
        const { supplierId, status, skip = 0, take = 20 } = query;

        const where: any = {
            deletedAt: null,
            ...(supplierId && { supplierId }),
            ...(status && { status }),
        };

        const [items, total] = await this.prisma.$transaction([
            this.db.purchaseOrder.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    supplier: {
                        select: { id: true, code: true, name: true, orderEmail: true },
                    },
                    _count: { select: { lines: true, goodsReceipts: true } },
                },
            }),
            this.db.purchaseOrder.count({ where }),
        ]);

        return { items, total, skip, take };
    }

    // ── Find by ID ────────────────────────────────────────────────────────────

    async findById(id: string) {
        const po = await this.db.purchaseOrder.findFirst({
            where: { id, deletedAt: null },
            include: {
                supplier: true,
                lines: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        product: {
                            select: {
                                id: true,
                                productCode: true,
                                name: true,
                                onHand: true,
                                onOrder: true,
                                landedCost: true,
                                vendorPartNumber: true,
                                minStock: true,
                                maxStock: true,
                                backOrdered: true,
                                committed: true,
                            },
                        },
                    },
                },
                goodsReceipts: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        lines: {
                            include: {
                                product: {
                                    select: {
                                        productCode: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!po) throw new NotFoundException('Purchase order not found');

        // Enrich GRNs with postedBy user name
        const enrichedGrns = await Promise.all(
            po.goodsReceipts.map(async (grn: any) => {
                if (!grn.postedBy) return { ...grn, postedByName: null };
                const user = await this.db.user.findUnique({
                    where: { id: grn.postedBy },
                    select: { displayName: true, firstName: true, lastName: true },
                });
                const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
                const name = user?.displayName ?? (fullName.length > 0 ? fullName : grn.postedBy);
                return { ...grn, postedByName: name };
            }),
        );

        //return po;
        return { ...po, goodsReceipts: enrichedGrns };
    }

    // ── Create ────────────────────────────────────────────────────────────────

    async create(dto: CreatePurchaseOrderDto, actorId?: string) {

        if (dto.orderType === 'MONTHLY' && dto.lines?.length) {
            await this.validateMonthlyQty(dto.lines, dto.supplierId);
        }

        const orderNumber = await this.generatePoNumber();

        const po = await this.db.purchaseOrder.create({
            data: {
                orderNumber,
                supplierId: dto.supplierId,
                status: 'DRAFT',
                expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
                reference: dto.reference ?? null,
                notes: dto.notes ?? null,
                orderType: dto.orderType ?? 'DAILY',
                lines: {
                    create: (dto.lines ?? []).map((l, i) => ({
                        productId: l.productId,
                        description: l.description,
                        orderedQty: l.orderedQty,
                        receivedQty: 0,
                        unitCost: l.unitCost,
                        lineTotal: +(Number(l.orderedQty) * Number(l.unitCost)).toFixed(4),
                        sortOrder: i,
                    })),
                },
            },
        });

        await this.recalcPoTotals(po.id);

        await this.audit(actorId, 'PO_CREATED', 'PurchaseOrder', po.id, {
            orderNumber,
            supplierId: dto.supplierId,
            lineCount: dto.lines?.length ?? 0,
        });

        return this.findById(po.id);
    }

    // ── Update (DRAFT only) ───────────────────────────────────────────────────

    async update(id: string, dto: UpdatePurchaseOrderDto, actorId?: string) {
        const po = await this.findById(id);

        if (po.status !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT purchase orders can be edited');
        }

        await this.db.purchaseOrder.update({
            where: { id },
            data: {
                ...(dto.expectedDate !== undefined && {
                    expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
                }),
                ...(dto.reference !== undefined && { reference: dto.reference }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
        });

        if (dto.lines !== undefined) {
            await this.db.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

            if (dto.lines.length) {
                await this.db.purchaseOrderLine.createMany({
                    data: dto.lines.map((l, i) => ({
                        purchaseOrderId: id,
                        productId: l.productId,
                        description: l.description,
                        orderedQty: l.orderedQty,
                        receivedQty: 0,
                        unitCost: l.unitCost,
                        lineTotal: +(Number(l.orderedQty) * Number(l.unitCost)).toFixed(4),
                        sortOrder: i,
                    })),
                });
            }
        }

        await this.recalcPoTotals(id);

        await this.audit(actorId, 'PO_UPDATED', 'PurchaseOrder', id, {
            updatedFields: Object.keys(dto),
        });

        return this.findById(id);
    }

    // ── Submit: DRAFT → SUBMITTED + email ────────────────────────────────────

    async submit(id: string, actorId?: string) {
        const po = await this.findById(id);

        if (po.status !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT purchase orders can be submitted');
        }
        if (!po.lines.length) {
            throw new BadRequestException('Cannot submit a PO with no lines');
        }

        // Update status
        await this.db.purchaseOrder.update({
            where: { id },
            data: { status: 'SUBMITTED' },
        });

        // Increment product.onOrder for each line
        for (const line of po.lines) {
            await this.db.product.update({
                where: { id: line.productId },
                data: { onOrder: { increment: Number(line.orderedQty) } },
            });

            await this.audit(actorId, 'STOCK_ON_ORDER_INCREASE', 'Product', line.productId, {
                poId: id,
                orderNumber: po.orderNumber,
                qty: Number(line.orderedQty),
            });
        }

        console.log('[PO] supplier.orderEmail:', po.supplier?.orderEmail);
        console.log('[PO] supplier.poAttachmentType:', po.supplier?.poAttachmentType);

        // ── Send email to supplier
        if (po.supplier?.orderEmail) {
            try {
                const attachmentType = po.supplier.poAttachmentType ?? 'PDF';
                console.log('[PO] Sending email with attachmentType:', attachmentType);
                await this.sendPoEmail(po, attachmentType);
            } catch (err) {
                console.error('[PO] Failed to send email to supplier:', err);
                // Don't throw — PO is already submitted, email failure is non-blocking
            }
        }

        await this.audit(actorId, 'PO_SUBMITTED', 'PurchaseOrder', id, {
            orderNumber: po.orderNumber,
            supplierEmail: po.supplier?.orderEmail ?? null,
        });

        return this.findById(id);
    }

    // ── Create GRN (DRAFT) ────────────────────────────────────────────────────

    async createGrn(poId: string, dto: CreateGrnDto, actorId?: string) {
        const po = await this.findById(poId);

        if (!['SUBMITTED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
            throw new BadRequestException('GRN can only be created for SUBMITTED or PARTIALLY_RECEIVED POs');
        }

        if (!dto.lines.length) {
            throw new BadRequestException('GRN must have at least one line');
        }

        const receiptNumber = await this.generateGrnNumber();

        const grn = await this.db.goodsReceipt.create({
            data: {
                receiptNumber,
                supplierId: po.supplierId,
                purchaseOrderId: poId,
                status: 'DRAFT',
                receiptDate: new Date(),
                reference: dto.reference ?? null,
                notes: dto.notes ?? null,
                lines: {
                    create: dto.lines.map((l, i) => ({
                        productId: l.productId,
                        description: l.description,
                        receivedQty: l.receivedQty,
                        unitCost: l.unitCost,
                        lineTotal: +(Number(l.receivedQty) * Number(l.unitCost)).toFixed(4),
                        sortOrder: i,
                    })),
                },
            },
            include: { lines: true },
        });

        await this.audit(actorId, 'GRN_CREATED', 'GoodsReceipt', grn.id, {
            receiptNumber,
            poId,
            lineCount: dto.lines.length,
        });

        return grn;
    }

    // ── Commit GRN → post stock ───────────────────────────────────────────────

    async commitGrn(poId: string, grnId: string, actorId?: string) {
        const po = await this.findById(poId);

        const grn = await this.db.goodsReceipt.findFirst({
            where: { id: grnId, purchaseOrderId: poId },
            include: { lines: true },
        });

        if (!grn) throw new NotFoundException('GRN not found');
        if (grn.status === 'POSTED') throw new BadRequestException('GRN already committed');

        // Post each line
        for (const line of grn.lines) {
            const qty = Number(line.receivedQty);
            const unitCost = Number(line.unitCost);

            // 1. Increase onHand, decrease onOrder
            const productBefore = await this.db.product.findUnique({
                where: { id: line.productId },
                select: { onHand: true, onOrder: true },
            });

            await this.db.product.update({
                where: { id: line.productId },
                data: {
                    onHand: { increment: qty },
                    onOrder: { decrement: Math.min(qty, Number(productBefore?.onOrder ?? 0)) },
                },
            });

            const productAfter = await this.db.product.findUnique({
                where: { id: line.productId },
                select: { onHand: true },
            });

            // 2. Update PO line receivedQty
            const poLine = po.lines.find((l: any) => l.productId === line.productId);
            if (poLine) {
                await this.db.purchaseOrderLine.update({
                    where: { id: poLine.id },
                    data: { receivedQty: { increment: qty } },
                });
            }

            // 3. StockMovement ledger entry
            await this.db.stockMovement.create({
                data: {
                    productId: line.productId,
                    movementType: 'PURCHASE',
                    direction: 'IN',
                    qty,
                    unitCost,
                    totalCost: line.lineTotal,
                    balanceAfter: Number(productAfter?.onHand ?? 0),
                    referenceModule: 'PURCHASE_ORDER',
                    referenceNo: po.orderNumber,
                    notes: `GRN ${grn.receiptNumber}`,
                    createdBy: actorId ?? null,
                },
            });

            // 4. Audit per product
            await this.audit(actorId, 'STOCK_RECEIVED', 'Product', line.productId, {
                grnId,
                receiptNumber: grn.receiptNumber,
                poId,
                qty,
                unitCost,
                onHandBefore: Number(productBefore?.onHand ?? 0),
                onHandAfter: Number(productAfter?.onHand ?? 0),
            });

            // 5. Auto-fulfill backorders FIFO
            await this.fulfillBackOrders(line.productId, qty, actorId, po.orderNumber);
        }

        // Mark GRN posted
        await this.db.goodsReceipt.update({
            where: { id: grnId },
            data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId ?? null },
        });

        // Determine if PO fully received
        const updatedPo = await this.findById(poId);
        const fullyReceived = updatedPo.lines.every(
            (l: any) => Number(l.receivedQty) >= Number(l.orderedQty),
        );

        await this.db.purchaseOrder.update({
            where: { id: poId },
            data: { status: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });

        await this.audit(actorId, 'GRN_COMMITTED', 'GoodsReceipt', grnId, {
            poId,
            receiptNumber: grn.receiptNumber,
            poStatusAfter: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        });

        return this.findById(poId);
    }

    // ── FIFO backorder fulfillment ────────────────────────────────────────────

    private async fulfillBackOrders(
        productId: string,
        receivedQty: number,
        actorId: string | undefined,
        poOrderNumber: string,
    ) {
        let remaining = receivedQty;

        const backOrderLines = await this.db.salesOrderItem.findMany({
            where: { productId, backOrderQty: { gt: 0 }, deletedAt: null },
            orderBy: { createdAt: 'asc' }, // FIFO
        });

        for (const line of backOrderLines) {
            if (remaining <= 0) break;

            const fulfill = Math.min(remaining, Number(line.backOrderQty));

            await this.db.salesOrderItem.update({
                where: { id: line.id },
                data: {
                    backOrderQty: { decrement: fulfill },
                    allocatedQty: { increment: fulfill },
                },
            });

            // Also update product.backOrdered counter
            await this.db.product.update({
                where: { id: productId },
                data: {
                    backOrdered: { decrement: fulfill },
                    committed: { decrement: fulfill },
                },
            });

            await this.audit(actorId, 'BACKORDER_FULFILLED', 'SalesOrderItem', line.id, {
                productId,
                fulfilled: fulfill,
                poOrderNumber,
                remainingBackOrder: Number(line.backOrderQty) - fulfill,
            });

            remaining -= fulfill;
        }
    }

    // ── Supplier items (for PO create — show supplier's products) ─────────────

    async supplierItems(supplierId: string) {
        // Get supplier code first
        const supplier = await this.db.invSupplier.findUnique({
            where: { id: supplierId },
            select: { code: true, name: true },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');

        // Products where vendorNumber matches supplier code
        const items = await this.db.product.findMany({
            where: {
                vendorNumber: supplier.code,
                deletedAt: null,
            },
            select: {
                id: true,
                productCode: true,
                name: true,
                vendorPartNumber: true,
                onHand: true,
                onOrder: true,
                backOrdered: true,
                landedCost: true,
                netSupplierBuyPrice: true,
                minStock: true,
                maxStock: true,
                committed: true,
            },
            orderBy: { productCode: 'asc' },
        });

        return { supplier, items };
    }

    private async sendPoEmail(po: any, attachmentType: string = 'PDF') {
        const lineRows = po.lines.map((l: any, i: number) =>
            `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace">${l.product?.productCode ?? ''}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.description}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${Number(l.orderedQty)}</td>
        </tr>`
        ).join('');

        const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
        <div style="background:#0b2948;padding:24px 32px;border-radius:8px 8px 0 0;">
          <table width="100%"><tr>
            <td><span style="color:#fff;font-size:20px;font-weight:bold;">AIRCO AUTO INSTRUMENTS</span><br/>
                <span style="color:#94a3b8;font-size:11px;">We provide Solutions</span></td>
            <td align="right"><span style="color:#94a3b8;font-size:11px;">PURCHASE ORDER</span><br/>
                <span style="color:#fff;font-size:24px;font-weight:bold;">${po.orderNumber}</span></td>
          </tr></table>
        </div>
        <div style="border:1px solid #e2e8f0;padding:24px 32px;">
          <table width="100%" style="margin-bottom:20px;"><tr>
            <td width="50%">
              <p style="font-size:10px;color:#64748b;margin:0 0 4px;">SUPPLIER</p>
              <p style="font-size:13px;font-weight:bold;margin:0;">${po.supplier.name}</p>
            </td>
            <td width="50%">
              <table>
                <tr><td style="font-size:10px;color:#64748b;padding-right:16px;">Order Date</td><td style="font-size:11px;font-weight:bold;">${new Date().toLocaleDateString('en-AU')}</td></tr>
                <tr><td style="font-size:10px;color:#64748b;padding-right:16px;">Expected Date</td><td style="font-size:11px;font-weight:bold;">${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-AU') : '—'}</td></tr>
                <tr><td style="font-size:10px;color:#64748b;padding-right:16px;">Order Type</td><td style="font-size:11px;font-weight:bold;">${po.orderType ?? 'DAILY'}</td></tr>
              </table>
            </td>
          </tr></table>
          <p style="font-size:13px;color:#334155;">Dear <strong>${po.supplier.name}</strong>,</p>
          <p style="font-size:13px;color:#334155;">Please find our purchase order attached. Kindly confirm receipt and expected delivery date.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#0b2948;color:#fff;">
                <th style="padding:8px 10px;text-align:left;font-size:11px;">LINE</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;">PART NO</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;">DESCRIPTION</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;">QTY</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>
          ${po.notes ? `<p style="margin-top:16px;font-size:13px;"><strong>Notes:</strong> ${po.notes}</p>` : ''}
          <p style="margin-top:24px;color:#64748b;font-size:12px;">This is an automated purchase order from Airco AIMS.<br/>Please reply to this email to confirm.</p>
        </div>
        <div style="background:#0b2948;padding:12px 32px;border-radius:0 0 8px 8px;text-align:center;">
          <span style="color:#94a3b8;font-size:10px;">END OF ORDER  •  ${po.orderNumber}  •  ${new Date().toLocaleDateString('en-AU')}</span>
        </div>
      </div>`;

        const attachments: Array<{ name: string; contentType: string; contentBytes: string }> = [];

        // ── Excel — matching their format ─────────────────────────────────────
        if (attachmentType === 'EXCEL' || attachmentType === 'BOTH') {
            const ExcelJS = (await import('exceljs')).default ?? await import('exceljs');
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Airco Order');

            // Col widths matching their layout
            ws.getColumn(1).width = 12;   // Line / Supplier label
            ws.getColumn(2).width = 35;   // Value / Qty
            ws.getColumn(3).width = 25;   // Part Number
            ws.getColumn(4).width = 12;   // Order label
            ws.getColumn(5).width = 16;   // Order value

            const navyFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b2948' } };
            const whiteFont: any = { color: { argb: 'FFFFFFFF' }, bold: true };
            const boldFont: any = { bold: true };
            const greyFont: any = { color: { argb: 'FF64748b' } };

            // Row 2: Order number header (right side)
            ws.getRow(2).getCell(4).value = 'Order';
            ws.getRow(2).getCell(4).font = greyFont;
            ws.getRow(2).getCell(5).value = po.orderNumber;
            ws.getRow(2).getCell(5).font = { bold: true, size: 14 };

            // Row 3: Date
            ws.getRow(3).getCell(4).value = 'Date';
            ws.getRow(3).getCell(4).font = greyFont;
            ws.getRow(3).getCell(5).value = new Date().toLocaleDateString('en-AU').replace(/\//g, '-');

            // Row 4: Expected Date
            ws.getRow(4).getCell(4).value = 'Expected';
            ws.getRow(4).getCell(4).font = greyFont;
            ws.getRow(4).getCell(5).value = po.expectedDate
                ? new Date(po.expectedDate).toLocaleDateString('en-AU').replace(/\//g, '-')
                : '—';

            // Row 5: Supplier
            ws.getRow(5).getCell(1).value = 'Supplier';
            ws.getRow(5).getCell(1).font = greyFont;
            ws.getRow(5).getCell(2).value = po.supplier.name;
            ws.getRow(5).getCell(2).font = boldFont;

            // Row 6: Supplier address
            if (po.supplier.deliveryAddress1) {
                ws.getRow(6).getCell(2).value = po.supplier.deliveryAddress1;
            }

            // Row 7: From (our address)
            ws.getRow(7).getCell(1).value = 'From';
            ws.getRow(7).getCell(1).font = greyFont;
            ws.getRow(7).getCell(2).value = 'Airco Auto Instruments Pty Ltd';
            ws.getRow(7).getCell(2).font = boldFont;

            ws.getRow(8).getCell(2).value = '33/105A Vanessa St';
            ws.getRow(9).getCell(2).value = 'Kingsgrove NSW 2208';

            // Blank row
            ws.getRow(10).height = 8;

            // Header row — navy background
            const headerRow = ws.getRow(11);
            ['', 'Qty.', 'Part Number', '', ''].forEach((v, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = v || '';
                cell.fill = navyFill;
                cell.font = whiteFont;
            });
            headerRow.height = 20;

            // Data rows
            po.lines.forEach((l: any, i: number) => {
                const row = ws.getRow(12 + i);
                row.getCell(1).value = `Line ${i + 1}`;
                row.getCell(2).value = Number(l.orderedQty);
                row.getCell(3).value = l.product?.productCode ?? '';
                row.getCell(4).value = l.description;

                // Alternating row background
                if (i % 2 === 0) {
                    [1, 2, 3, 4, 5].forEach(c => {
                        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    });
                }
                row.height = 18;
            });

            const excelBuffer = await wb.xlsx.writeBuffer();
            attachments.push({
                name: `${po.orderNumber}.xlsx`,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                contentBytes: Buffer.from(excelBuffer as ArrayBuffer).toString('base64'),
            });
        }

        // ── PDF
        if (attachmentType === 'PDF' || attachmentType === 'BOTH') {
            const PDFDocument = require('pdfkit');
            const logoPath = path.resolve(__dirname, '../../../../assets/logo.png');
            console.log('[PO] logoPath:', logoPath, 'exists:', fs.existsSync(logoPath));

            const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks: Uint8Array[] = [];
                doc.on('data', (c: Uint8Array) => chunks.push(c));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const pageW = 595;
                const pageH = 842;
                const margin = 50;

                // ── Header band ───────────────────────────────────────────────
                doc.rect(0, 0, pageW, 88).fill('#0b2948');

                // Logo or company name
                const logoExists = fs.existsSync(logoPath);
                if (logoExists) {
                    doc.image(logoPath, margin, 14, { height: 55 });
                } else {
                    doc.fillColor('#ffffff')
                        .fontSize(18).font('Helvetica-Bold')
                        .text('AIRCO AUTO INSTRUMENTS', margin, 20, { width: 270 });
                    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                        .text('We provide Solutions', margin, 56);
                }

                // PO label + number (right)
                doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                    .text('PURCHASE ORDER', pageW - 210, 22, { width: 160, align: 'right' });
                doc.fontSize(26).font('Helvetica-Bold').fillColor('#ffffff')
                    .text(po.orderNumber, pageW - 210, 38, { width: 160, align: 'right' });

                doc.fillColor('#000000');

                // ── Info block ────────────────────────────────────────────────
                const infoY = 104;
                const col1 = margin;
                const col2 = 320;

                // Supplier
                doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
                    .text('SUPPLIER', col1, infoY);
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a')
                    .text(po.supplier.name, col1, infoY + 13, { width: 240 });
                if (po.supplier.deliveryAddress1) {
                    doc.fontSize(9).font('Helvetica').fillColor('#475569')
                        .text(po.supplier.deliveryAddress1, col1, infoY + 28, { width: 240 });
                }

                // Order details (right column)
                const rows: [string, string][] = [
                    ['Order Date', new Date().toLocaleDateString('en-AU')],
                    ['Expected Date', po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-AU') : '—'],
                    ['Order Type', po.orderType ?? 'DAILY'],
                    ['Freight', po.supplier.dispatchMethod?.replace(/_/g, ' ') ?? 'Supplier Carrier'],
                ];
                let dY = infoY;
                for (const [label, value] of rows) {
                    doc.fontSize(8).font('Helvetica').fillColor('#64748b')
                        .text(label, col2, dY, { width: 105 });
                    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
                        .text(value, col2 + 108, dY, { width: 120 });
                    dY += 17;
                }

                // ── Dispatch to ───────────────────────────────────────────────
                const dispY = infoY + 72;
                doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
                    .text('DISPATCH TO', col1, dispY);
                doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
                    .text('Airco Auto Instruments Pty Ltd', col1, dispY + 13)
                    .text('33/105A Vanessa St', col1, dispY + 25)
                    .text('Kingsgrove NSW 2208', col1, dispY + 37);

                // ── Divider ───────────────────────────────────────────────────
                const tableTop = dispY + 60;
                doc.moveTo(margin, tableTop - 6)
                    .lineTo(pageW - margin, tableTop - 6)
                    .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

                // ── Table header
                const cols = {
                    line: { x: margin, w: 40 },  // "Line 1"
                    qty: { x: margin + 44, w: 35 },  // QTY narrow
                    code: { x: margin + 82, w: 100 },  // Part No
                    desc: { x: margin + 185, w: 310 },  // Description — max space
                };

                doc.rect(margin, tableTop, pageW - margin * 2, 20).fill('#0b2948');
                doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
                doc.text('LINE', cols.line.x + 2, tableTop + 6, { width: cols.line.w });
                doc.text('QTY', cols.qty.x, tableTop + 6, { width: cols.qty.w, align: 'right' });
                doc.text('PART NO', cols.code.x + 4, tableTop + 6, { width: cols.code.w });
                doc.text('DESCRIPTION', cols.desc.x, tableTop + 6, { width: cols.desc.w });

                // ── Table rows 
                let rowY = tableTop + 22;
                po.lines.forEach((l: any, i: number) => {
                    const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                    doc.rect(margin, rowY - 2, pageW - margin * 2, 20).fill(bg);

                    doc.fontSize(9).font('Helvetica').fillColor('#0f172a');
                    doc.text(`Line ${i + 1}`, cols.line.x + 2, rowY + 4, { width: cols.line.w });
                    doc.text(String(Number(l.orderedQty)), cols.qty.x, rowY + 4, { width: cols.qty.w, align: 'right' });
                    doc.text(l.product?.productCode ?? '', cols.code.x + 4, rowY + 4, { width: cols.code.w });
                    doc.text(l.description, cols.desc.x, rowY + 4, { width: cols.desc.w });

                    rowY += 22;
                });

                // ── Bottom line ────────────────────────────────────────────────
                doc.moveTo(margin, rowY + 2)
                    .lineTo(pageW - margin, rowY + 2)
                    .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

                // ── Notes ─────────────────────────────────────────────────────
                rowY += 14;
                if (po.notes) {
                    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
                        .text('NOTES', margin, rowY);
                    doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
                        .text(po.notes, margin, rowY + 12, { width: pageW - margin * 2 });
                    rowY += 40;
                }

                // Authorised by
                rowY += 10;
                doc.fontSize(9).font('Helvetica').fillColor('#475569')
                    .text(`Authorised by: ${po.supplier.serviceRep ?? 'Airco Purchasing'}`, margin, rowY);

                // ── Footer band ───────────────────────────────────────────────
                doc.rect(0, pageH - 36, pageW, 36).fill('#0b2948');
                doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
                    .text(
                        `END OF ORDER  •  ${po.orderNumber}  •  Generated ${new Date().toLocaleDateString('en-AU')}`,
                        0, pageH - 20, { width: pageW, align: 'center' }
                    );

                doc.end();
            });

            attachments.push({
                name: `${po.orderNumber}.pdf`,
                contentType: 'application/pdf',
                contentBytes: pdfBuffer.toString('base64'),
            });
        }

        await this.mailService.sendMail({
            to: po.supplier.orderEmail,
            subject: `Purchase Order ${po.orderNumber} — Airco`,
            html,
            attachments,
            fromDisplayName: 'Airco Purchasing',
            saveToSentItems: true,
        });
    }

    private async validateMonthlyQty(lines: any[], supplierId: string) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        for (const line of lines) {
            const product = await this.db.product.findUnique({
                where: { id: line.productId },
                select: { productCode: true, maxStock: true },
            });

            if (!product?.maxStock) continue;

            // Sum of all PO lines for this product this month
            const existing = await this.db.purchaseOrderLine.aggregate({
                where: {
                    productId: line.productId,
                    purchaseOrder: {
                        supplierId,
                        createdAt: { gte: monthStart, lt: monthEnd },
                        status: { not: 'CANCELLED' },
                    },
                },
                _sum: { orderedQty: true },
            });

            const alreadyOrdered = Number(existing._sum?.orderedQty ?? 0);
            const total = alreadyOrdered + Number(line.orderedQty);

            if (total > Number(product.maxStock)) {
                throw new BadRequestException(
                    `${product.productCode}: Monthly max qty (${product.maxStock}) would be exceeded. Already ordered: ${alreadyOrdered}, attempting: ${line.orderedQty}`
                );
            }
        }
    }

}