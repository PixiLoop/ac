import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TERMS_LABEL: Record<string, string> = {
  DAYS_14: '14 Days',
  DAYS_30: '30 Days',
  DAYS_60: '60 Days',
  DAYS_90: '90 Days',
  PAY_NOW: 'Pay Now',
  COD: 'COD',
};

@Injectable()
export class JobBookEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  private formatEntry(row: any) {
    return {
      id: row.id,
      entryNumber: row.entryNumber,
      customerId: row.customerId,
      customerNumber: row.customerNumber,
      customerName: row.customer?.name || null,
      orderNumber: row.orderNumber || '',
      abn: row.abn || '',
      termsOfTrade: row.termsOfTrade || '',
      shippingName: row.shippingName || '',
      shippingAddress1: row.shippingAddress1 || '',
      shippingAddress2: row.shippingAddress2 || '',
      shippingAddress3: row.shippingAddress3 || '',
      accountName: row.accountName || '',
      accountAddress1: row.accountAddress1 || '',
      accountAddress2: row.accountAddress2 || '',
      accountAddress3: row.accountAddress3 || '',
      lastEntryDate: row.lastEntryDate
        ? new Date(row.lastEntryDate).toISOString().slice(0, 10)
        : '',
      inHouse: row.inHouse || '',
      contactName: row.contactName || '',
      phoneNumber: row.phoneNumber || '',
      completionTime: row.completionTime
        ? new Date(row.completionTime).toISOString()
        : '',
      previousJob: row.previousJob || '',
      warranty: !!row.warranty,
      inwardFreight: row.inwardFreight || '',
      freightMethod: row.freightMethod || '',
      outwardFreight: row.outwardFreight || '',
      itemDetails: row.itemDetails || '',
      regoFleetNum: row.regoFleetNum || '',
      odometers: row.odometers || '',
      serialNumber: row.serialNumber || '',
      constantK: row.constantK || '',
      serviceDetails: row.serviceDetails || '',
      userName: row.userName || '',
      repairer: row.repairer || '',
      // Prefer dedicated jobNumber; fall back so edit form is never blank for older rows
      jobNumber: row.jobNumber || row.jobNum || row.entryNumber || '',
      jobNum: row.jobNum || row.jobNumber || '',
      invoiceNum: row.invoiceNum || '',
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  private async nextEntryNumber() {
    const year = new Date().getFullYear();
    const prefix = `JBE-${year}-`;
    const last = await (this.prisma as any).jobBookEntry.findFirst({
      where: { entryNumber: { startsWith: prefix } },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    let seq = 1;
    if (last?.entryNumber) {
      const n = parseInt(String(last.entryNumber).replace(prefix, ''), 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /** Visible Job Number on the form (auto on save when blank) */
  private async nextJobNumber() {
    const year = new Date().getFullYear();
    const prefix = `JOB-${year}-`;
    const rows = await (this.prisma as any).jobBookEntry.findMany({
      where: {
        deletedAt: null,
        jobNumber: { startsWith: prefix },
      },
      select: { jobNumber: true },
      orderBy: { jobNumber: 'desc' },
      take: 1,
    });
    let seq = 1;
    const candidate = rows[0]?.jobNumber || '';
    if (candidate.startsWith(prefix)) {
      const n = parseInt(String(candidate).replace(prefix, ''), 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private mapDto(dto: any) {
    const parseDate = (v: any) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    return {
      customerId: dto.customerId || null,
      customerNumber: String(dto.customerNumber || '').trim(),
      orderNumber: dto.orderNumber?.trim() || null,
      abn: dto.abn?.trim() || null,
      termsOfTrade: dto.termsOfTrade?.trim() || null,
      shippingName: dto.shippingName?.trim() || null,
      shippingAddress1: dto.shippingAddress1?.trim() || null,
      shippingAddress2: dto.shippingAddress2?.trim() || null,
      shippingAddress3: dto.shippingAddress3?.trim() || null,
      accountName: dto.accountName?.trim() || null,
      accountAddress1: dto.accountAddress1?.trim() || null,
      accountAddress2: dto.accountAddress2?.trim() || null,
      accountAddress3: dto.accountAddress3?.trim() || null,
      lastEntryDate: parseDate(dto.lastEntryDate),
      jobNum: dto.jobNum?.trim() || null,
      inHouse: dto.inHouse?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      phoneNumber: dto.phoneNumber?.trim() || null,
      completionTime: parseDate(dto.completionTime),
      previousJob: dto.previousJob?.trim() || null,
      warranty: !!dto.warranty,
      inwardFreight: dto.inwardFreight?.trim() || null,
      freightMethod: dto.freightMethod?.trim() || null,
      outwardFreight: dto.outwardFreight?.trim() || null,
      itemDetails: dto.itemDetails?.trim() || null,
      regoFleetNum: dto.regoFleetNum?.trim() || null,
      odometers: dto.odometers?.trim() || null,
      serialNumber: dto.serialNumber?.trim() || null,
      constantK: dto.constantK?.trim() || null,
      serviceDetails: dto.serviceDetails?.trim() || null,
      userName: dto.userName?.trim() || null,
      repairer: dto.repairer?.trim() || null,
      jobNumber: dto.jobNumber?.trim() || null,
      invoiceNum: dto.invoiceNum?.trim() || null,
    };
  }

  async list(query: Record<string, any> = {}) {
    const search = String(query.search || '').trim();
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { customerNumber: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { jobNum: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { itemDetails: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { repairer: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { freightMethod: { contains: search, mode: 'insensitive' } },
        { regoFleetNum: { contains: search, mode: 'insensitive' } },
        { invoiceNum: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const rows = await (this.prisma as any).jobBookEntry.findMany({
      where,
      include: { customer: { select: { id: true, name: true, customerNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.take) || 200, 500),
    });

    const data = rows.map((r: any) => this.formatEntry(r));
    return { data, total: data.length };
  }

  async getOne(id: string) {
    let row = await (this.prisma as any).jobBookEntry.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { select: { id: true, name: true, customerNumber: true } } },
    });
    if (!row) throw new NotFoundException('Job book entry not found');

    // Backfill job number for rows created before auto-assign existed
    if (!String(row.jobNumber || '').trim()) {
      const jobNumber = await this.nextJobNumber();
      row = await (this.prisma as any).jobBookEntry.update({
        where: { id },
        data: {
          jobNumber,
          jobNum: row.jobNum || jobNumber,
        },
        include: { customer: { select: { id: true, name: true, customerNumber: true } } },
      });
    }

    return this.formatEntry(row);
  }

  async create(dto: any) {
    const data = this.mapDto(dto);
    if (!data.customerNumber) {
      throw new BadRequestException('Customer Number is required');
    }
    const entryNumber = dto.entryNumber?.trim() || (await this.nextEntryNumber());
    if (!data.jobNumber) {
      data.jobNumber = await this.nextJobNumber();
    }
    if (!data.jobNum) {
      data.jobNum = data.jobNumber;
    }
    const row = await (this.prisma as any).jobBookEntry.create({
      data: { ...data, entryNumber },
      include: { customer: { select: { id: true, name: true, customerNumber: true } } },
    });
    return this.formatEntry(row);
  }

  async update(id: string, dto: any) {
    const existing = await (this.prisma as any).jobBookEntry.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, jobNumber: true, jobNum: true },
    });
    if (!existing) throw new NotFoundException('Job book entry not found');

    const data = this.mapDto(dto);
    if (!data.customerNumber) {
      throw new BadRequestException('Customer Number is required');
    }
    // Backfill job number on save if it was never assigned
    if (!data.jobNumber && !existing.jobNumber) {
      data.jobNumber = await this.nextJobNumber();
    } else if (!data.jobNumber && existing.jobNumber) {
      data.jobNumber = existing.jobNumber;
    }
    if (!data.jobNum) {
      data.jobNum = data.jobNumber || existing.jobNum || existing.jobNumber;
    }
    const row = await (this.prisma as any).jobBookEntry.update({
      where: { id },
      data,
      include: { customer: { select: { id: true, name: true, customerNumber: true } } },
    });
    return this.formatEntry(row);
  }

  async remove(id: string) {
    const existing = await (this.prisma as any).jobBookEntry.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Job book entry not found');
    await (this.prisma as any).jobBookEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true, id };
  }

  /** Autofill shipping / account / contact from customer master */
  async lookupCustomer(customerNumber: string) {
    const number = String(customerNumber || '').trim();
    if (!number) throw new BadRequestException('Customer Number is required');

    const customer = await this.prisma.customer.findFirst({
      where: {
        deletedAt: null,
        customerNumber: { equals: number, mode: 'insensitive' },
      },
      include: {
        addresses: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        contacts: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!customer) throw new NotFoundException('Invalid Customer Number');

    const shipping =
      customer.addresses.find((a) => a.type === 'SHIPPING' && a.isDefault) ||
      customer.addresses.find((a) => a.type === 'SHIPPING') ||
      customer.addresses.find((a) => a.isDefault) ||
      customer.addresses[0];

    const account =
      customer.addresses.find((a) => a.type === 'CHARGE' && a.isDefault) ||
      customer.addresses.find((a) => a.type === 'CHARGE') ||
      customer.addresses.find((a) => a.type === 'POSTAL') ||
      customer.addresses.find((a) => a.type === 'STATEMENT') ||
      shipping;

    const contact =
      customer.contacts.find((c) => c.isPrimary) ||
      customer.contacts.find((c) => c.role === 'GENERAL') ||
      customer.contacts[0];

    const line3 = (a?: typeof shipping) => {
      if (!a) return '';
      return [a.city, a.state, a.postcode].filter(Boolean).join(' ').trim() || a.address3 || '';
    };

    return {
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      customerName: customer.name,
      orderNumber: '',
      abn: customer.abn || '',
      termsOfTrade: TERMS_LABEL[customer.paymentTerms] || customer.paymentTerms || '',
      shippingName: shipping?.name || customer.name || '',
      shippingAddress1: shipping?.address1 || '',
      shippingAddress2: shipping?.address2 || '',
      shippingAddress3: line3(shipping),
      accountName: account?.name || customer.registeredName || customer.name || '',
      accountAddress1: account?.address1 || '',
      accountAddress2: account?.address2 || '',
      accountAddress3: line3(account),
      contactName: contact
        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
        : '',
      phoneNumber: contact?.phone || '',
      lastEntryDate: new Date().toISOString().slice(0, 10),
    };
  }
}
