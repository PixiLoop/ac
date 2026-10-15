import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionReportDto } from './dto/create-subscription-report.dto';
import { UpdateSubscriptionReportDto } from './dto/update-subscription-report.dto';

@Injectable()
export class FMSubscriptionReportsService {
    constructor(private readonly prisma: PrismaService) { }

    private async generateSubscriptionNumber() {
        const count = await this.prisma.fMSubscriptionReport.count();
        return `FMW-${1000 + count + 1}`;
    }

    async list(q?: any) {

        return this.prisma.fMSubscriptionReport.findMany({
            where: q ? {
                reportType: q.reportType || undefined,
                fmCustomer: q.fmCustomer ? {
                    fmWebNumber: {
                        contains: (q.fmCustomer as string).toUpperCase() || undefined
                    }
                } : undefined
            } : undefined,
            include: {
                fmCustomer: { include: { customer: true } },
                invoices: {
                    where: {
                        invoiceType: "SUBSCRIPTION",
                    },
                    take: 1,
                    orderBy: {
                        issuedAt: "desc"
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const report = await this.prisma.fMSubscriptionReport.findUnique({
            where: { id },
            include: { fmCustomer: { include: { customer: true } }, invoices: true },
        });
        if (!report) throw new NotFoundException('Subscription report not found');
        const { lines } = await this.computeLineItems(report)
        return {...report, subtotal: lines.reduce((s, l) => s + l.total, 0), lines};
    }

    async create(dto: CreateSubscriptionReportDto) {
        const subscriptionNumber = await this.generateSubscriptionNumber();
        return this.prisma.fMSubscriptionReport.create({
            data: {
                ...dto,
                subscriptionNumber: subscriptionNumber,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined
            }
        });
    }

    async update(id: string, dto: UpdateSubscriptionReportDto) {
        const report = await this.findById(id);

        if (report.invoices.length > 0) {
            return null
        }
        return this.prisma.fMSubscriptionReport.update({ where: { id }, data: dto });
    }

    async delete(id: string) {
        await this.findById(id);
        return this.prisma.fMSubscriptionReport.delete({ where: { id } });
    }

    private async computeLineItems(report: any) {
        const fmCustomer = await this.prisma.fMCustomer.findUnique({
            where: { id: report.fmCustomerId },
            include: {
                customer: true,
                services: { include: { product: true } },
                cameraSimMixServices: { include: { service: true } },
                options: { include: { option: true } },
            },
        });
        if (!fmCustomer) throw new NotFoundException('FM Customer not found');

        // Active FM Install records for this customer (charge-eligible ones)
        const installs = await this.prisma.fMInstall.findMany({
            where: {
                fmCustomerNum: fmCustomer.fmWebNumber,
                chargeFlag: true,
            },
        });

        const lines: { label: string; qty: number; rate: number; total: number; invoicePeriodMonths: number }[] = [];

        const periodMultiplier = report.invoicePeriodMonths;

        const OPTION_TYPE_MAP: Record<string, string> = {
            INTERN_SIM: 'INT_SIM',
            AI_OPTION: 'AI_EXTRA',
            TMA_OPTION: 'TMA_OPTION',
            RIM_OPTION: 'RIM_OPTION',
            NRC_OPTION: 'NRC_OPTION',
            SAFE_GUARD: 'SAFE_GUARD',
        };

        if (report.reportType === 'SERVICE' || report.reportType === 'SERVICE_OPTION') {
            for (const svc of fmCustomer.services) {

                // if (report.filterServiceCode && svc.productId !== report.filterServiceCode) continue;
                const code = svc.product.productCode.trim();
                // const activeCount = installs.filter(i => i.fmwService?.trim() === code).length;
                // if (activeCount === 0) continue;
                // const rate = Number(svc.price) * periodMultiplier;
                lines.push({
                    label: code,
                    qty: svc.active,
                    rate: svc.monthlyCharge,
                    total: Number(svc.active) * Number(svc.monthlyCharge),
                    invoicePeriodMonths: report.invoicePeriodMonths
                });
            }
            for (const svc of fmCustomer.cameraSimMixServices) {

                // if (report.filterServiceCode && svc.productId !== report.filterServiceCode) continue;
                const code = svc.service.code.trim();
                // const activeCount = installs.filter(i => i.fmwService?.trim() === code).length;
                // if (activeCount === 0) continue;
                // const rate = Number(svc.price) * periodMultiplier;
                lines.push({
                    label: code,
                    qty: svc.active || 0,
                    rate: Number(svc.monthlyCharge || 0),
                    total: Number(svc.active) * Number(svc.monthlyCharge || 0),
                    invoicePeriodMonths: report.invoicePeriodMonths
                });
            }
        }

        if (report.reportType === 'SERVICE_OPTION') {
            for (const opt of fmCustomer.options) {
                if (!opt.enabled) continue;
                const rate = Number(opt.charge ?? 0) * periodMultiplier;
                lines.push({
                    label: opt.option.label,
                    qty: opt.vehicleCount ?? 0,
                    rate,
                    total: (opt.vehicleCount ?? 0) * rate,
                    invoicePeriodMonths: report.invoicePeriodMonths
                });
            }
        }

        if (OPTION_TYPE_MAP[report.reportType]) {
            const wantedCode = OPTION_TYPE_MAP[report.reportType];
            const opt = fmCustomer.options.find(o => o.option.code === wantedCode);
            if (opt?.enabled) {
                const rate = Number(opt.charge ?? 0) * periodMultiplier;
                lines.push({
                    label: opt.option.label,
                    qty: opt.vehicleCount ?? 0,
                    rate,
                    total: (opt.vehicleCount ?? 0) * rate,
                    invoicePeriodMonths: report.invoicePeriodMonths
                });
            }
        }

        // Compute the period this invoice will cover
        const now = new Date();
        const periodStart = report.lastInvoicedPeriodEnd
            ? new Date(report.lastInvoicedPeriodEnd)
            : report.startDate
                ? new Date(report.startDate)
                : new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + report.invoicePeriodMonths);

        return { fmCustomer, lines, periodStart, periodEnd };
    }

    private formatPeriodAsMonths(periodStart: Date, periodEnd: Date): string {
        const startMonth = periodStart.toLocaleDateString('en-AU', { month: 'long' });
        const lastBilledMonth = new Date(periodEnd);
        lastBilledMonth.setMonth(lastBilledMonth.getMonth() - 1);
        const endMonth = lastBilledMonth.toLocaleDateString('en-AU', { month: 'long' });

        const sameYear = periodStart.getFullYear() === lastBilledMonth.getFullYear();
        const startLabel = sameYear ? startMonth : `${startMonth} ${periodStart.getFullYear()}`;
        const endLabel = `${endMonth} ${lastBilledMonth.getFullYear()}`;

        return startMonth === endMonth && sameYear
            ? `${startLabel} ${periodStart.getFullYear()}`
            : `${startLabel} to ${endLabel}`;
    }

    async preview(id: string) {
        const report = await this.findById(id);
        const { fmCustomer, lines, periodStart, periodEnd } = await this.computeLineItems(report);
        return {
            customerName: fmCustomer.customer?.name,
            periodStart,
            periodEnd,
            periodLabel: this.formatPeriodAsMonths(periodStart, periodEnd),
            lines,
            subtotal: lines.reduce((s, l) => s + l.total, 0),
        };
    }

    private isEligible(report: any): boolean {
        if (!report.isActive) return false;
        const now = new Date();

        if (!report.lastInvoicedPeriodEnd) {
            if (report.startDate && now < new Date(report.startDate)) return false;
            return true;
        }

        const lastEnd = new Date(report.lastInvoicedPeriodEnd);
        const dueDate = new Date(lastEnd);
        dueDate.setMonth(dueDate.getMonth() - report.volumeOffsetMonths);
        return now >= dueDate;
    }

    async generate(id: string) {
        const report = await this.findById(id);
        if (report.reportTarget !== 'Invoice') {
            throw new BadRequestException('This report is Excel-target and cannot generate an invoice — use Export instead');
        }
        if (!this.isEligible(report)) {
            throw new BadRequestException('This report is not yet due for invoicing this period');
        }

        const { fmCustomer, lines, periodStart, periodEnd } = await this.computeLineItems(report);
        if (!lines.length) {
            throw new BadRequestException('No active assets/services found to invoice');
        }

        const invoiceNumber = await this.generateInvoiceNumber();
        const linesTotal = lines.reduce((s, l) => s + l.total, 0);
        let subtotal: number;
        let gst: number;
        let total: number;
        if (report.priceIncludesGst) {
            total = linesTotal;
            subtotal = Number((linesTotal / 1.1).toFixed(2));
            gst = Number((total - subtotal).toFixed(2));
        } else {
            subtotal = linesTotal;
            gst = Number((subtotal * 0.1).toFixed(2));
            total = subtotal + gst;
        }

        const periodLabel = this.formatPeriodAsMonths(periodStart, periodEnd);

        const invoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceType: 'SUBSCRIPTION',
                customerId: fmCustomer.customerId,
                status: 'ISSUED',
                issuedAt: new Date(),
                subtotal,
                gst,
                total,
                subscriptionReportId: report.id,
                externalNotes: `Subscription period: ${periodLabel}`,
                fmSubscriptionItems: {
                    createMany: {
                        data: lines.map(item => ({
                            invoicePeriodMonths: item.invoicePeriodMonths,
                            label: item.label,
                            quantity: item.qty,
                            rate: item.rate,
                            total: item.total,
                            subscriptionId: report.id
                        }))
                    }
                }
            },
        });

        await this.prisma.fMSubscriptionReport.update({
            where: { id: report.id },
            data: { lastInvoicedPeriodEnd: periodEnd },
        });

        return invoice;
    }

    async generateAllEligible() {
        const reports = await this.prisma.fMSubscriptionReport.findMany({ where: { isActive: true } });
        const results: { reportId: string; invoiceNumber?: string; skipped?: string }[] = [];

        for (const report of reports) {
            if (!this.isEligible(report)) {
                results.push({ reportId: report.id, skipped: 'Not yet due' });
                continue;
            }
            try {
                const invoice = await this.generate(report.id);
                results.push({ reportId: report.id, invoiceNumber: invoice.invoiceNumber });
            } catch (err: any) {
                results.push({ reportId: report.id, skipped: err.message ?? 'Failed' });
            }
        }

        return results;
    }

    async checkPrepaid() {
        const reports = await this.prisma.fMSubscriptionReport.findMany({
            where: { isActive: true, invoicePeriodMonths: { gt: 1 } },
            include: { fmCustomer: { include: { customer: true } } },
        });
        return reports.filter(r => this.isEligible(r));
    }

    private async generateInvoiceNumber(): Promise<string> {
        const prefix = 'INV';
        const startNum = 7001;
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
}