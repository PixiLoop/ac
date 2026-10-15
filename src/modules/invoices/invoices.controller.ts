import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceItemsDto, ListInvoicesDto } from './dto/update-invoice.dto';
import { XeroInvoiceService } from '../xero/xero-invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
    constructor(
        private readonly service: InvoicesService,
        private readonly xeroService: XeroInvoiceService,
    ) { }

    @Get()
    @Permissions('invoices.view')
    async list(@Query() dto: ListInvoicesDto) {
        return this.service.list(dto);
    }

    //STATIC routes FIRST, before :id
    @Post('from-salesorder/:salesOrderId')
    @Permissions('invoices.create')
    async createFromSO(@Param('salesOrderId') salesOrderId: string) {
        return this.service.createFromSalesOrder(salesOrderId);
    }

    @Get('uninvoiced-items-by-number/:orderNumber')
    @Permissions('invoices.view')
    async getUninvoicedItemsByNumber(@Param('orderNumber') orderNumber: string) {
        return this.service.getUninvoicedItemsByNumber(orderNumber);
    }

    @Get('for-reversal/:invoiceNumber')
    @Permissions('invoices.view')
    async getForReversal(@Param('invoiceNumber') invoiceNumber: string) {
        return this.service.getInvoiceForReversal(invoiceNumber);
    }

    @Get('for-credit/:invoiceNumber')
    @Permissions('invoices.view')
    async getForCredit(@Param('invoiceNumber') invoiceNumber: string) {
        return this.service.getInvoiceForCredit(invoiceNumber);
    }

    @Post()
    @Permissions('invoices.create')
    async create(@Body() dto: CreateInvoiceDto) {
        return this.service.create(dto);
    }

    @Get('uninvoiced-items/:salesOrderId')
    @Permissions('invoices.view')
    async getUninvoicedItems(@Param('salesOrderId') salesOrderId: string) {
        return this.service.getUninvoicedItems(salesOrderId);
    }

    // GET — data fetch only
    @Get('preinstall-data/:preinstallId')
    @Permissions('invoices.view')
    async getPreinstallData(@Param('preinstallId') preinstallId: string) {
        return this.service.getPreinstallInvoiceData(preinstallId);
    }

    // POST — invoice save after preinstall link
    @Post('link-preinstall/:invoiceId/:preinstallId')
    @Permissions('invoices.edit')
    async linkPreinstall(
        @Param('invoiceId') invoiceId: string,
        @Param('preinstallId') preinstallId: string,
    ) {
        return this.service.linkPreinstallInvoice(preinstallId, invoiceId);
    }

    //DYNAMIC :id routes AFTER
    @Get(':id')
    @Permissions('invoices.view')
    async find(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Patch(':id')
    @Permissions('invoices.edit')
    async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
        //return this.service.update(id, dto);
        const result = await this.service.update(id, dto);

        // Auto-sync to Xero if status changed to non-DRAFT
        if (dto.status && dto.status !== 'DRAFT') {
            try {
                await this.xeroService.pushInvoice(id);
            } catch (err) {
                // Xero sync fail invoice should save
                console.warn('Auto Xero sync failed:', err?.message);
            }
        }

        return result;

    }

    @Post('from-preinstall/:preinstallId')
    @Permissions('invoices.create')
    async createFromPreinstall(@Param('preinstallId') preinstallId: string) {
        return this.service.createFromPreinstall(preinstallId);
    }

    @Post(':id/email')
    @Permissions('invoices.edit')
    async emailPdf(@Param('id') id: string) {
        return this.service.emailInvoicePdf(id);
    }

    @Patch(':id/items')
    @Permissions('invoices.edit')
    async updateItems(@Param('id') id: string, @Body() dto: UpdateInvoiceItemsDto) {
        return this.service.updateItems(id, dto);
    }

    @Delete(':id')
    @Permissions('invoices.delete')
    async remove(@Param('id') id: string) {
        return this.service.softDelete(id);
    }
}