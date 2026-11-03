import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InstallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const INSTALL_STATUSES = new Set<string>(Object.values(InstallStatus));

function parseInstallStatus(v: unknown): InstallStatus | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const s = String(v);
  return INSTALL_STATUSES.has(s) ? (s as InstallStatus) : undefined;
}

@Injectable()
export class FMInstallService {
  constructor(private readonly prisma: PrismaService) { }

  async list(query: any) {
    const and: any[] = [];

    if (query?.customer) {
      and.push({
        OR: [
          { aasCustomerNum: { contains: query.customer, mode: 'insensitive' } },
          { fmCustomerNum: { contains: query.customer, mode: 'insensitive' } },
        ],
      });
    }

    if (query?.fmCusNum) {
      and.push({ fmCustomerNum: { contains: query.fmCusNum, mode: 'insensitive' } });
    }

    if (query?.colSearch) {
      and.push({
        OR: [
          { baseUnit: { contains: query.colSearch, mode: 'insensitive' } },
          { rego: { contains: query.colSearch, mode: 'insensitive' } },
          { mixOrgId: { contains: query.colSearch, mode: 'insensitive' } },
        ],
      });
    }

    if (query?.status) and.push({ status: query.status });

    if (query?.chargeOnly === 'true') and.push({ notCharged: false });

    if (query?.visionFitted === 'true') {
      and.push({
        installDetail: { visionType: { not: null } },
      });
    }

    if (query?.unitType) {
      and.push({ installDetail: { fmUnitType: query.unitType } });
    }

    if (query?.serviceType) {
      and.push({ installDetail: { serviceCode: { contains: query.serviceType } } });
    }

    if (query?.hwType) {
      and.push({ installDetail: { fmUnitCode: query.hwType } });
    }

    if (query?.cameraType) {
      and.push({ installDetail: { cameraType: query.cameraType } });
    }

    if (query?.extraService) {
      // extraService filter on fmwService field
      and.push({ fmwService: { contains: query.extraService, mode: 'insensitive' } });
    }

    const where = and.length ? { AND: and } : {};

    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 10);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fMInstall.findMany({
        where,
        include: { installDetail: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.fMInstall.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    const record = await this.prisma.fMInstall.findUnique({
      where: { id },
      include: { installDetail: true },
    });
    if (!record) throw new NotFoundException('FM Install not found');

    // Backfill Author / Install By from linked preinstall when empty (legacy rows)
    if (record.preinstallId && (!record.author || !record.installBy || !record.installInvoice)) {
      const pre = await this.prisma.fMPreinstall.findFirst({
        where: { id: record.preinstallId, deletedAt: null },
        include: { installDetail: true },
      });
      if (pre) {
        const resolveUserName = async (userId?: string | null) => {
          if (!userId) return null;
          if (!/^c[a-z0-9]{20,}$/i.test(userId)) return userId;
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, firstName: true, lastName: true, email: true },
          });
          return (
            user?.displayName?.trim() ||
            `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
            user?.email ||
            userId
          );
        };
        const patch: any = {};
        if (!record.installBy) {
          patch.installBy = await resolveUserName(pre.installDetail?.installer ?? null);
        }
        if (!record.author) {
          patch.author = await resolveUserName(pre.assignedUserId || pre.createdBy || null);
        }
        if (!record.installInvoice && pre.invoiceId) {
          const inv = await this.prisma.invoice.findUnique({
            where: { id: pre.invoiceId },
            select: { invoiceNumber: true },
          });
          if (inv?.invoiceNumber) {
            patch.installInvoice = inv.invoiceNumber;
            patch.invoiceRef = inv.invoiceNumber;
          }
        }
        if (Object.keys(patch).length) {
          return this.prisma.fMInstall.update({
            where: { id },
            data: patch,
            include: { installDetail: true },
          });
        }
      }
    }

    return record;
  }

  async findByPreinstallId(preinstallId: string) {
    // Return preinstall + its installDetail for pre-population
    const preinstall = await this.prisma.fMPreinstall.findFirst({
      where: { id: preinstallId, deletedAt: null },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: true,
        Depots: true,
      },
    });
    if (!preinstall) throw new NotFoundException('Preinstall not found');

    const resolveUserName = async (userId?: string | null) => {
      if (!userId) return null;
      if (!/^c[a-z0-9]{20,}$/i.test(userId)) return userId;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, firstName: true, lastName: true, email: true },
      });
      return (
        user?.displayName?.trim() ||
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
        user?.email ||
        userId
      );
    };

    const authorName = await resolveUserName(
      preinstall.assignedUserId || preinstall.createdBy || null,
    );
    const installByName = await resolveUserName(
      preinstall.installDetail?.installer ?? null,
    );

    return {
      ...preinstall,
      authorName,
      installByName,
    };
  }

  async create(dto: any) {
    const mix = String(dto.mixCode ?? dto.installDetail?.mixCode ?? '').trim();
    if (!String(dto.fmCustomerNum ?? '').trim()) {
      throw new BadRequestException('Setup FM Customer First');
    }
    const fm = await this.prisma.fMCustomer.findFirst({
      where: { fmWebNumber: { equals: String(dto.fmCustomerNum).trim(), mode: 'insensitive' } },
      select: { id: true, customer: { select: { deletedAt: true } } },
    });
    if (!fm || fm.customer?.deletedAt) throw new BadRequestException('Invalid FMCusNum');
    const serviceCode = String(dto.fmwService ?? dto.installDetail?.serviceCode ?? '').trim();
    const service = serviceCode
      ? await this.prisma.product.findFirst({
        where: { productCode: { equals: serviceCode, mode: 'insensitive' }, isActive: true },
        select: { id: true },
      })
      : null;
    if (!service) throw new BadRequestException('Invalid Service');
    if (!mix || mix === '0_0_0_0_0_0') throw new BadRequestException('Invalid MIXService_Code');
    // Link installDetail from preinstall if preinstallId given
    let installDetailId: string | undefined;

    if (dto.preinstallId) {
      const detail = await this.prisma.fMInstallDetail.findUnique({
        where: { preinstallId: dto.preinstallId },
      });
      if (detail) installDetailId = detail.id;
    }

    return this.prisma.fMInstall.create({
      data: {
        preinstallId: dto.preinstallId ?? null,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : null,
        installDate: dto.installDate ? new Date(dto.installDate) : null,
        installInvoice: dto.installInvoice ?? null,
        author: dto.author ?? null,
        installBy: dto.installBy ?? null,
        aasCustomerNum: dto.aasCustomerNum ?? null,
        fmCustomerNum: dto.fmCustomerNum ?? null,
        mixOrgId: dto.mixOrgId ?? null,
        mixAssetNum: dto.mixAssetNum ?? null,
        baseUnit: dto.baseUnit ?? null,
        vehicleMake: dto.vehicleMake ?? null,
        vehicleModel: dto.vehicleModel ?? null,
        vehicleYear: dto.vehicleYear ?? null,
        rego: dto.rego ?? null,
        fiNumber: dto.fiNumber ?? null,
        depot: dto.depot ?? null,
        site: dto.site ?? null,
        serviceNumber: dto.serviceNumber ? Number(dto.serviceNumber) : null,
        fmwService: dto.fmwService ?? null,
        mixCode: dto.mixCode ?? null,
        status: dto.status ?? null,
        commissionedDate: dto.commissionedDate ? new Date(dto.commissionedDate) : null,
        notCharged: dto.notCharged ?? null,
        ...(installDetailId && {
          installDetail: { connect: { id: installDetailId } },
        }),
      },
      include: { installDetail: true },
    });
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.fMInstall.findUnique({
      where: { id },
      include: { installDetail: { select: { serviceCode: true, mixCode: true } } },
    });
    if (!existing) throw new NotFoundException('FM Install not found');
    const fmCustomerNum = String(dto.fmCustomerNum || existing.fmCustomerNum || '').trim();
    // Empty string from the form must fall back to existing / detail service code
    const fmwService = String(
      dto.fmwService ||
      existing.fmwService ||
      existing.installDetail?.serviceCode ||
      '',
    ).trim();
    const mixCode = String(
      dto.mixCode || existing.mixCode || existing.installDetail?.mixCode || '',
    ).trim();
    if (!fmCustomerNum) throw new BadRequestException('Setup FM Customer First');
    const fm = await this.prisma.fMCustomer.findFirst({
      where: { fmWebNumber: { equals: fmCustomerNum, mode: 'insensitive' } },
      select: { id: true, customer: { select: { deletedAt: true } } },
    });
    if (!fm || fm.customer?.deletedAt) throw new BadRequestException('Invalid FMCusNum');
    // const service = fmwService
    //   ? await this.prisma.product.findFirst({
    //       where: { productCode: { equals: fmwService, mode: 'insensitive' }, isActive: true },
    //       select: { id: true },
    //     })
    //   : null;
    // if (!service) throw new BadRequestException(`Invalid Service${fmwService ? ` — ${fmwService}` : ''}`);
    if (!mixCode || mixCode === '0_0_0_0_0_0') throw new BadRequestException('Invalid MIXService_Code');

    const now = new Date();
    const effectiveStatus = dto.status ?? existing.status;

    // Compares a date's month/year against "now" — 'past' | 'current' | 'future'
    const monthRelation = (date: Date): 'past' | 'current' | 'future' => {
      const dMonths = date.getFullYear() * 12 + date.getMonth();
      const nMonths = now.getFullYear() * 12 + now.getMonth();
      if (dMonths < nMonths) return 'past';
      if (dMonths > nMonths) return 'future';
      return 'current';
    };

    let chargeFlag = dto.chargeFlag !== undefined ? dto.chargeFlag : existing.chargeFlag;
    let commissionMonth = existing.commissionMonth;

    // Per the FM charging logic table:
    // INSTALL            → never charged
    // ACTIVE              → charged unless commissionedDate is in a future month
    // DECOMMISSIONED/HOLD → charged unless decommissionedDate is in a past month
    if (effectiveStatus === 'INSTALL') {
      chargeFlag = false;
    } else if (effectiveStatus === 'ACTIVE') {
      const commDateRaw = dto.commissionedDate ?? existing.commissionedDate;
      const commDate = commDateRaw ? new Date(commDateRaw) : null;

      if (commDate) {
        chargeFlag = monthRelation(commDate) !== 'future';
        commissionMonth = `${commDate.getFullYear()}-${String(commDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        chargeFlag = false; // no commission date recorded yet
      }
    } else if (effectiveStatus === 'DECOMMISSIONED' || effectiveStatus === 'ON_HOLD') {
      const decomDateRaw = dto.decommissionedDate ?? existing.decommissionedDate;
      const decomDate = decomDateRaw ? new Date(decomDateRaw) : null;

      chargeFlag = !!decomDate && monthRelation(decomDate) !== 'past';
    }

    // Manual "Not Charged" override — highest priority, always wins
    const effectiveNotCharged = dto.notCharged !== undefined ? dto.notCharged : existing.notCharged;
    if (effectiveNotCharged) {
      chargeFlag = false;
    }

    const parseDate = (v: unknown) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const parseIntOrUndef = (v: unknown) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const status = parseInstallStatus(dto.status);

    return this.prisma.fMInstall.update({
      where: { id },
      data: {
        entryDate: parseDate(dto.entryDate),
        installDate: parseDate(dto.installDate),
        installInvoice: dto.installInvoice ?? undefined,
        author: dto.author ?? undefined,
        installBy: dto.installBy ?? undefined,
        aasCustomerNum: dto.aasCustomerNum ?? undefined,
        fmCustomerNum: fmCustomerNum || undefined,
        mixOrgId: dto.mixOrgId ?? undefined,
        mixAssetNum: dto.mixAssetNum ?? undefined,
        baseUnit: dto.baseUnit ?? undefined,
        vehicleMake: dto.vehicleMake ?? undefined,
        vehicleModel: dto.vehicleModel ?? undefined,
        vehicleYear: dto.vehicleYear ?? undefined,
        rego: dto.rego ?? undefined,
        fiNumber: dto.fiNumber ?? undefined,
        depot: dto.depot ?? undefined,
        site: dto.site ?? undefined,
        serviceNumber: parseIntOrUndef(dto.serviceNumber),
        fmwService: fmwService || undefined,
        mixCode: mixCode || undefined,
        status,
        commissionedDate: parseDate(dto.commissionedDate),
        decommissionedDate: parseDate(dto.decommissionedDate),
        notCharged: dto.notCharged ?? undefined,
        chargeFlag,
        commissionMonth,
        invoiceRef: dto.invoiceRef ?? undefined,
        preinstallRef: dto.preinstallRef ?? undefined,
      },
      include: { installDetail: true },
    });
  }

  // Update installDetail directly (for dynamic panel saves)
  async updateDetail(installId: string, detailData: any) {
    const install = await this.prisma.fMInstall.findUnique({
      where: { id: installId },
      include: { installDetail: true },
    });
    if (!install) throw new NotFoundException('FM Install not found');

    const installStatus = parseInstallStatus(detailData.installStatus) ?? null;

    const cameraCount =
      detailData.cameraCount === '' || detailData.cameraCount == null
        ? null
        : Number.isFinite(Number(detailData.cameraCount))
          ? Number(detailData.cameraCount)
          : null;

    const installDate =
      !detailData.installDate || detailData.installDate === ''
        ? null
        : (() => {
          const d = new Date(detailData.installDate);
          return Number.isNaN(d.getTime()) ? null : d;
        })();

    const cleanScalars = {
      installType: detailData.installType ?? null,
      fmUnitType: detailData.fmUnitType ?? null,
      fmUnitCode: detailData.fmUnitCode ?? null,
      modem4G: detailData.modem4G ?? null,
      serviceCode: detailData.serviceCode ?? null,
      mixCode: detailData.mixCode ?? null,
      mixOrgId: detailData.mixOrgId ?? null,
      mixSim1: detailData.mixSim1 ?? null,
      sim1Type: detailData.sim1Type ?? null,
      unitSim: detailData.unitSim ?? null,
      unitSerial: detailData.unitSerial ?? null,
      unitIMEI: detailData.unitIMEI ?? null,
      visionType: detailData.visionType ?? null,
      cameraType: detailData.cameraType ?? null,
      cameraCount,
      mixSim2: detailData.mixSim2 ?? null,
      sim2Type: detailData.sim2Type ?? null,
      visSim: detailData.visSim ?? null,
      visIMEI: detailData.visIMEI ?? null,
      vis1Serial: detailData.vis1Serial ?? null,
      vis2Serial: detailData.vis2Serial ?? null,
      vis3Serial: detailData.vis3Serial ?? null,
      vis4Serial: detailData.vis4Serial ?? null,
      aiOption: detailData.aiOption ?? null,
      tmaOption: detailData.tmaOption ?? null,
      rimOption: detailData.rimOption ?? null,
      assetNumber: detailData.assetNumber ?? null,
      fleetNumber: detailData.fleetNumber ?? null,
      vehicleMake: detailData.vehicleMake ?? null,
      vehicleModel: detailData.vehicleModel ?? null,
      yearVariant: detailData.yearVariant ?? null,
      vinNumber: detailData.vinNumber ?? null,
      regoNumber: detailData.regoNumber ?? null,
      installLocation: detailData.installLocation ?? null,
      installerId: detailData.installer ?? null, // <-- Use scalar foreign key field here
      installStatus,
      installDate,
    };

    // Then remove `installerRelation` entirely and use cleanScalars directly:
    if (!install.installDetailId) {
      if (!install.preinstallId) {
        throw new BadRequestException('No install detail linked — open from a preinstall first');
      }
      const created = await this.prisma.fMInstallDetail.upsert({
        where: { preinstallId: install.preinstallId },
        create: {
          preinstall: { connect: { id: install.preinstallId } },
          ...cleanScalars,
        },
        update: cleanScalars,
      });
      await this.prisma.fMInstall.update({
        where: { id: installId },
        data: { installDetail: { connect: { id: created.id } } },
      });
      return created;
    }

    return this.prisma.fMInstallDetail.update({
      where: { id: install.installDetailId },
      data: cleanScalars,
    });
  }

  async getComments(installId: string) {
    const thread = await this.prisma.commentThread.findFirst({
      where: { entityType: 'FM_INSTALL', entityId: installId },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    return thread?.comments ?? [];
  }

  async addComment(installId: string, message: string, userId: string, userName?: string) {
    let thread = await this.prisma.commentThread.findFirst({
      where: { entityType: 'FM_INSTALL', entityId: installId },
    });

    if (!thread) {
      thread = await this.prisma.commentThread.create({
        data: { entityType: 'FM_INSTALL', entityId: installId },
      });
    }

    return this.prisma.comment.create({
      data: {
        threadId: thread.id,
        message,
        createdBy: userId,
        createdByName: userName ?? null,
        type: 'COMMENT',
      },
    });
  }

  async deleteComment(commentId: string) {
    return this.prisma.comment.delete({ where: { id: commentId } });
  }

  async createFromPreinstall(preinstallId: string) {
    const preinstall: any = await (this.prisma as any).fMPreinstall.findFirst({
      where: { id: preinstallId, deletedAt: null },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: true,
        Depots: true,
        bulkVehicles: { orderBy: { rowNo: 'asc' } },
      },
    });

    if (!preinstall) throw new NotFoundException('Preinstall not found');

    if (preinstall.status !== 'INVOICED') {
      throw new BadRequestException(
        `Only INVOICED preinstalls can be added to FM Log. Current: ${preinstall.status}`
      );
    }

    if (preinstall.installId) {
      return this.prisma.fMInstall.findUnique({
        where: { id: preinstall.installId },
        include: { installDetail: true },
      });
    }

    const d: any = preinstall.installDetail;
    const bulkRows: any[] = Array.isArray(preinstall.bulkVehicles) ? preinstall.bulkVehicles : [];

    if (preinstall.isBulk && bulkRows.length) {
      const now = new Date();
      const created: any[] = [];
      for (const v of bulkRows) {
        const install = await this.prisma.fMInstall.create({
          data: {
            preinstallId: preinstall.id,
            preinstallRef: preinstall.preinstallNo,
            aasCustomerNum: preinstall.customer?.customerNumber ?? null,
            fmCustomerNum: preinstall.fmCustomer?.fmWebNumber ?? null,
            mixAssetNum: v.assetNumber ?? null,
            baseUnit: v.fmUnitCode ?? d?.fmUnitCode ?? null,
            vehicleMake: v.vehicleMake ?? null,
            vehicleModel: v.vehicleModel ?? null,
            vehicleYear: v.yearVariant ?? null,
            rego: v.regoNumber ?? null,
            fiNumber: v.fleetNumber ?? null,
            depot: v.depot ?? preinstall.Depots?.name ?? null,
            site: v.site ?? null,
            fmwService: v.serviceCode ?? d?.serviceCode ?? null,
            installDate: v.installDate ?? d?.installDate ?? null,
            entryDate: now,
            status: 'INSTALL',
            chargeFlag: false,
          },
        });
        created.push(install);
      }

      await this.prisma.fMPreinstall.update({
        where: { id: preinstallId },
        data: { installId: created[0]?.id, status: 'COMPLETED' },
      });

      return { bulk: true, count: created.length, items: created };
    }

    const missing: string[] = [];
    if (!d?.serviceCode) missing.push('Service Code');
    if (!d?.regoNumber) missing.push('Rego Number');
    if (missing.length) {
      throw new BadRequestException(
        `Cannot add to FM Log — missing required field(s): ${missing.join(', ')}. Please update the install detail first.`
      );
    }

    const resolveUserName = async (userId?: string | null) => {
      if (!userId) return null;
      if (!/^c[a-z0-9]{20,}$/i.test(userId)) return userId;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, firstName: true, lastName: true, email: true },
      });
      return (
        user?.displayName?.trim() ||
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
        user?.email ||
        userId
      );
    };

    const installBy = await resolveUserName(d?.installer ?? null);
    const author = await resolveUserName(
      preinstall.assignedUserId || preinstall.createdBy || null,
    );

    let invoiceRef: string | null = null;
    let installInvoice: string | null = null;
    if (preinstall.invoiceId) {
      const inv = await this.prisma.invoice.findUnique({
        where: { id: preinstall.invoiceId },
        select: { invoiceNumber: true },
      });
      invoiceRef = inv?.invoiceNumber ?? null;
      installInvoice = inv?.invoiceNumber ?? null;
    }

    const mapped = {
      preinstallRef: preinstall.preinstallNo,
      aasCustomerNum: preinstall.customer?.customerNumber ?? null,
      fmCustomerNum: preinstall.fmCustomer?.fmWebNumber ?? null,
      mixOrgId: d?.mixOrgId ?? null,
      mixAssetNum: d?.assetNumber ?? null,
      baseUnit: d?.fmUnitCode ?? null,
      vehicleMake: d?.vehicleMake ?? null,
      vehicleModel: d?.vehicleModel ?? null,
      vehicleYear: d?.yearVariant ?? null,
      rego: d?.regoNumber ?? null,
      fiNumber: d?.fleetNumber ?? null,
      depot: preinstall.Depots?.name ?? d?.installLocation ?? null,
      site: d?.installLocation ?? null,
      fmwService: d?.serviceCode ?? null,
      mixCode: d?.mixCode ?? null,
      installDate: d?.installDate ?? null,
      installBy,
      author,
      invoiceRef,
      installInvoice,
    };

    const now = new Date();
    const TYPES_UPDATING_TARGET = ['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT'];
    const shouldUpdateTarget = TYPES_UPDATING_TARGET.includes(preinstall.type) && !!preinstall.targetInstallId;

    if (shouldUpdateTarget) {
      const install = await this.prisma.fMInstall.update({
        where: { id: preinstall.targetInstallId },
        data: {
          ...mapped,
          ...(d?.id && {
            installDetail: { connect: { id: d.id } },
          }),
        },
        include: { installDetail: true },
      });

      await this.prisma.fMPreinstall.update({
        where: { id: preinstallId },
        data: { installId: install.id, status: 'COMPLETED' },
      });

      return install;
    }

    const install = await this.prisma.fMInstall.create({
      data: {
        preinstallId: preinstall.id,
        ...mapped,
        entryDate: now,
        status: 'INSTALL',
        chargeFlag: false,
        commissionMonth: null,
        ...(d?.id && {
          installDetail: { connect: { id: d.id } },
        }),
      },
      include: { installDetail: true },
    });

    await this.prisma.fMPreinstall.update({
      where: { id: preinstallId },
      data: { installId: install.id, status: 'COMPLETED' },
    });

    return install;
  }
}