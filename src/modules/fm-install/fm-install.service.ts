import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      },
    });
    if (!preinstall) throw new NotFoundException('Preinstall not found');
    return preinstall;
  }

  async create(dto: any) {
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
    const existing = await this.prisma.fMInstall.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FM Install not found');

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

    return this.prisma.fMInstall.update({
      where: { id },
      data: {
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        installInvoice: dto.installInvoice ?? undefined,
        author: dto.author ?? undefined,
        installBy: dto.installBy ?? undefined,
        aasCustomerNum: dto.aasCustomerNum ?? undefined,
        fmCustomerNum: dto.fmCustomerNum ?? undefined,
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
        serviceNumber: dto.serviceNumber ? Number(dto.serviceNumber) : undefined,
        fmwService: dto.fmwService ?? undefined,
        mixCode: dto.mixCode ?? undefined,
        status: dto.status ?? undefined,
        commissionedDate: dto.commissionedDate ? new Date(dto.commissionedDate) : undefined,
        decommissionedDate: dto.decommissionedDate ? new Date(dto.decommissionedDate) : undefined,
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
    if (!install.installDetailId) throw new NotFoundException('No install detail linked');

    const clean = {
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
      cameraCount: detailData.cameraCount ?? null,
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
      installer: detailData.installer ?? null,
      installStatus: detailData.installStatus ?? null,
      installDate: detailData.installDate ? new Date(detailData.installDate) : null,
    };

    return this.prisma.fMInstallDetail.update({
      where: { id: install.installDetailId },
      data: clean,
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
    const preinstall = await this.prisma.fMPreinstall.findFirst({
      where: { id: preinstallId, deletedAt: null },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: true,
      },
    });

    if (!preinstall) throw new NotFoundException('Preinstall not found');

    if (preinstall.status !== 'INVOICED') {
      throw new BadRequestException(
        `Only INVOICED preinstalls can be added to FM Log. Current: ${preinstall.status}`
      );
    }

    if (preinstall.installId) {
      throw new BadRequestException('FM Install already exists for this preinstall');
    }

    const d = preinstall.installDetail;

    const missing: string[] = [];
    if (!d?.serviceCode) missing.push('Service Code');
    if (!d?.regoNumber) missing.push('Rego Number');
    if (missing.length) {
      throw new BadRequestException(
        `Cannot add to FM Log — missing required field(s): ${missing.join(', ')}. Please update the install detail first.`
      );
    }

    const now = new Date();
    const TYPES_UPDATING_TARGET = ['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT'];
    const shouldUpdateTarget = TYPES_UPDATING_TARGET.includes(preinstall.type) && !!preinstall.targetInstallId;

    if (shouldUpdateTarget) {
      const install = await this.prisma.fMInstall.update({
        where: { id: preinstall.targetInstallId! },
        data: {
          preinstallRef: preinstall.preinstallNo,

          // Customer info
          aasCustomerNum: preinstall.customer?.customerNumber ?? undefined,
          fmCustomerNum: preinstall.fmCustomer?.fmWebNumber ?? undefined,
          mixOrgId: d?.mixOrgId ?? undefined,
          mixAssetNum: d?.assetNumber ?? undefined,

          // Vehicle
          baseUnit: d?.fmUnitCode ?? undefined,
          vehicleMake: d?.vehicleMake ?? undefined,
          vehicleModel: d?.vehicleModel ?? undefined,
          vehicleYear: d?.yearVariant ?? undefined,
          rego: d?.regoNumber ?? undefined,


          // Service — this is the part that actually changes on a Modify
          // (e.g. a new camera adds vision to the service code)
          fmwService: d?.serviceCode ?? undefined,
          mixCode: d?.mixCode ?? undefined,

          installDate: d?.installDate ?? undefined,

          // Status/charge/commission fields are NOT touched — Modify/
          // Warranty/Replacement don't reset billing state, only asset data
          ...(d?.id && {
            installDetail: { connect: { id: d.id } },
          }),
        },
        include: { installDetail: true },
      });

      await this.prisma.fMPreinstall.update({
        where: { id: preinstallId },
        data: { installId: install.id },
      });

      return install;
    }

    // NEW_INSTALL / TRANSFER_UNIT — create a fresh FM Install record
    const install = await this.prisma.fMInstall.create({
      data: {
        preinstallId: preinstall.id,
        preinstallRef: preinstall.preinstallNo,

        // Customer info
        aasCustomerNum: preinstall.customer?.customerNumber ?? null,
        fmCustomerNum: preinstall.fmCustomer?.fmWebNumber ?? null,
        mixOrgId: d?.mixOrgId ?? null,
        mixAssetNum: d?.assetNumber ?? null,

        // Vehicle
        baseUnit: d?.fmUnitCode ?? null,
        vehicleMake: d?.vehicleMake ?? null,
        vehicleModel: d?.vehicleModel ?? null,
        vehicleYear: d?.yearVariant ?? null,
        rego: d?.regoNumber ?? null,


        // Service
        fmwService: d?.serviceCode ?? null,
        mixCode: d?.mixCode ?? null,

        // Install info
        installDate: d?.installDate ?? null,
        entryDate: now,

        // Status — "Install" initially (not yet active/billing)
        status: 'INSTALL',
        chargeFlag: false,  // user manually sets commission date → auto ON
        commissionMonth: null,  // user sets later

        // Link installDetail
        ...(d?.id && {
          installDetail: { connect: { id: d.id } },
        }),
      },
      include: { installDetail: true },
    });

    // Update preinstall — installId link
    await this.prisma.fMPreinstall.update({
      where: { id: preinstallId },
      data: { installId: install.id },
    });

    return install;
  }
}