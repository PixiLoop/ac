import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { XeroOAuthService } from './xero-oauth.service';
import { Invoice as XeroInvoice, LineItem, Contact, LineAmountTypes } from 'xero-node';

@Injectable()
export class XeroInvoiceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly oauthService: XeroOAuthService,
    ) { }

    async pushInvoice(invoiceId: string) {
        // 1. Load invoice from DB
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, deletedAt: null },
            include: {
                customer: true,
                items: { where: { deletedAt: null } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status === 'CANCELLED') throw new BadRequestException('Cannot push cancelled invoice');

        // 2. Get valid Xero client
        const { xero, tenantId } = await this.oauthService.getValidClient();

        // 3. Find or create Xero contact
        const xeroContactId = await this.findOrCreateContact(xero, tenantId, invoice);

        // 4. Build Xero invoice payload
        const xeroInvoice = this.buildXeroInvoice(invoice, xeroContactId);

        // 5. Push to Xero
        let xeroInvoiceId = invoice.xeroInvoiceId;

        if (xeroInvoiceId) {
            // Update existing
            await xero.accountingApi.updateInvoice(
                tenantId,
                xeroInvoiceId,
                { invoices: [xeroInvoice] },
            );
        } else {
            // Create new
            const res = await xero.accountingApi.createInvoices(
                tenantId,
                { invoices: [xeroInvoice] },
            );
            xeroInvoiceId = res.body?.invoices?.[0]?.invoiceID ?? '';
        }

        // 6. Save xeroInvoiceId to DB
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                xeroInvoiceId,
                xeroSyncedAt: new Date(),
            },
        });

        return {
            success: true,
            xeroInvoiceId,
            message: 'Invoice pushed to Xero successfully',
        };
    }

    private async findOrCreateContact(xero: any, tenantId: string, invoice: any) {
        const customerName = invoice.customer?.name ?? invoice.billingName ?? 'Unknown';

        // Search existing contact
        try {
            const existing = await xero.accountingApi.getContacts(
                tenantId,
                undefined,
                `Name="${customerName}"`,
                undefined, 
                undefined, 
                undefined,
                false
            );
            const contacts = existing.body?.contacts ?? [];
            if (contacts.length > 0) {
                return contacts[0].contactID;
            }
        } catch { }

        // Create new contact
        const created = await xero.accountingApi.createContacts(tenantId, {
            contacts: [{
                name: customerName,
                emailAddress: invoice.customer?.email ?? undefined,
            }],
        });

        return created.body?.contacts?.[0]?.contactID ?? '';
    }

    private buildXeroInvoice(invoice: any, xeroContactId: string): XeroInvoice {
        const statusMap: Record<string, XeroInvoice.StatusEnum> = {
            DRAFT: XeroInvoice.StatusEnum.DRAFT,
            ISSUED: XeroInvoice.StatusEnum.AUTHORISED,
            PARTIALLY_PAID: XeroInvoice.StatusEnum.AUTHORISED,
            PAID: XeroInvoice.StatusEnum.AUTHORISED,
            CANCELLED: XeroInvoice.StatusEnum.VOIDED,
        };

        const lineItems: LineItem[] = invoice.items.map((item: any) => ({
            description: item.description ?? '',
            quantity: Number(item.quantity),
            unitAmount: Number(item.unitPrice),
            discountRate: Number(item.discountPct ?? 0),
            accountCode: '200',
            taxType: 'OUTPUT',
        }));

        if (Number(invoice.freight ?? 0) > 0) {
            lineItems.push({ description: 'Freight', quantity: 1, unitAmount: Number(invoice.freight), discountRate: 0, accountCode: '200', taxType: 'OUTPUT' });
        }
        if (Number(invoice.sundries ?? 0) > 0) {
            lineItems.push({ description: 'Sundries', quantity: 1, unitAmount: Number(invoice.sundries), discountRate: 0, accountCode: '200', taxType: 'OUTPUT' });
        }
        if (Number(invoice.labour ?? 0) > 0) {
            lineItems.push({ description: 'Labour', quantity: 1, unitAmount: Number(invoice.labour), discountRate: 0, accountCode: '200', taxType: 'OUTPUT' });
        }

        return {
            type: XeroInvoice.TypeEnum.ACCREC,
            contact: { contactID: xeroContactId } as Contact,
            lineItems,
            date: invoice.issuedAt
                ? new Date(invoice.issuedAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            dueDate: invoice.dueDate
                ? new Date(invoice.dueDate).toISOString().split('T')[0]
                : undefined,
            invoiceNumber: invoice.invoiceNumber,
            reference: invoice.reference ?? undefined,
            status: statusMap[invoice.status] ?? XeroInvoice.StatusEnum.DRAFT,
            lineAmountTypes: LineAmountTypes.Exclusive,
        };
    }

    async getXeroStatus(invoiceId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId },
            select: { xeroInvoiceId: true, xeroSyncedAt: true },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');

        return {
            xeroInvoiceId: invoice.xeroInvoiceId,
            xeroSyncedAt: invoice.xeroSyncedAt,
            synced: !!invoice.xeroInvoiceId,
        };
    }
}