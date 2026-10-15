import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobBoardsService } from '../job-boards/job-boards.service'

const allowedTransitions = {
  NOT_ACTIONED: ['WORKSHOP_SETUP'],
  WORKSHOP_SETUP: ['WAITING_INSTALL'],
  WAITING_INSTALL: ['INSTALLED'],
  INSTALLED: ['INVOICED'],
  INVOICED: ['COMPLETED'],
};

@Injectable()
export class FMPreinstallService {
  constructor(private readonly prisma: PrismaService,
    private readonly jobBoardsService: JobBoardsService,
  ) { }

  //Status → List mapping
  readonly STATUS_TO_LIST: Record<string, string> = {
    NOT_ACTIONED: 'Admin To Do',
    WORKSHOP_SETUP: 'To Be Done',
    WAITING_INSTALL: 'Waiting Install',
    INSTALLED: 'Installed',
    INVOICED: 'Ready to Invoice',
    COMPLETED: 'Ready to Invoice',
  };

  async getCustomerOptions(q?: string) {
    return this.prisma.customer.findMany({
      where: {
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { registeredName: { contains: q, mode: 'insensitive' } },
            { customerNumber: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        customerNumber: true,
        registeredName: true,
      },
      take: 20,
    });
  }

  async getServiceCodeOptions(q?: string) {
    return this.prisma.fMInstallDetail.findMany({
      where: {
        serviceCode: {
          not: null,
          ...(q && { contains: q }),
        },
      },
      select: {
        serviceCode: true,
      },
      distinct: ['serviceCode'],
    });
  }

  async findByInvoiceId(invoiceId: string) {
    return this.prisma.fMPreinstall.findFirst({
      where: { invoiceId, deletedAt: null },
      select: { id: true, preinstallNo: true, status: true },
    });
  }

  async findByJobId(jobId: string) {
    return this.prisma.fMPreinstall.findFirst({
      where: {
        OR: [
          { jobId },
          { installJobId: jobId },
        ],
        deletedAt: null,
      },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: true,
      },
    });
  }

  async searchTargetInstalls(q: string) {
    if (!q?.trim()) return [];
    return this.prisma.fMInstall.findMany({
      where: {
        OR: [
          { rego: { contains: q, mode: 'insensitive' } },
          { mixAssetNum: { contains: q, mode: 'insensitive' } },
          { fiNumber: { contains: q, mode: 'insensitive' } },
          { aasCustomerNum: { contains: q, mode: 'insensitive' } },
          { preinstallRef: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        rego: true,
        mixAssetNum: true,
        fiNumber: true,
        vehicleMake: true,
        vehicleModel: true,
        status: true,
        baseUnit: true,
      },
      take: 20,
    });
  }

  async getTargetInstall(id: string) {
    const install = await this.prisma.fMInstall.findUnique({
      where: { id },
      include: {
        installDetail: {
          include: {
            preinstall: {
              include: {
                items: true
              }
            }
          }
        }
      },
    });
    if (!install) throw new Error('Target install not found');
    return install;
  }

  async getUnitCodeOptions() {
    return this.prisma.fMInstallDetail.findMany({
      where: {
        fmUnitCode: { not: null },
      },
      select: {
        fmUnitCode: true,
      },
      distinct: ['fmUnitCode'],
    });
  }

  async findById(id: string) {
    return this.prisma.fMPreinstall.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
        },
        installDetail: {
          include: {
            fMInstallDetailOrgIds: {
              include: {
                organizations: true
              }
            }
          }
        },
      }
    });
  }

  async create(dto: any, userId: string) {
    const TYPES_REQUIRING_TARGET = ['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT', 'TRANSFER_UNIT'];
    if (TYPES_REQUIRING_TARGET.includes(dto.type) && !dto.targetInstallId) {
      throw new Error('Target Record is required for this install type');
    }

    if (dto.targetInstallId) {
      const target = await this.prisma.fMInstall.findUnique({ where: { id: dto.targetInstallId } });
      if (!target) throw new Error('Target record not found');

      if (dto.type === 'TRANSFER_UNIT' && target.status !== 'DECOMMISSIONED') {
        throw new Error('Set Install Record to Decommissioned first');
      }
    }

    const preinstallNo = await this.generateNumber();

    const preinstall = await this.prisma.fMPreinstall.create({
      data: {
        preinstallNo,
        type: dto.type,
        status: dto.status,
        createdBy: userId,
        ...(dto?.depotId && {
          Depots: { connect: { id: dto.depotId } },
        }),
        ...(dto.targetInstallId && {
          targetInstall: { connect: { id: dto.targetInstallId } },
        }),

        shippingName: dto.shippingName,
        shippingAddress1: dto.shippingAddress1 ?? null,
        shippingAddress2: dto.shippingAddress2 ?? null,
        shippingAddress3: null, //not used

        billingName: dto.billingName,
        billingAddress1: dto.billingAddress1 ?? null,
        billingAddress2: dto.billingAddress2 ?? null,
        billingAddress3: null, //not used
        notes: dto?.notes || "",
        assignedUserId: dto.assignedUserId || userId,
        customer: {
          connect: { id: dto.customerId },
        },

        fmCustomer: dto.fmCustomerId
          ? { connect: { id: dto.fmCustomerId } }
          : undefined,
      },
    });

    //NEW (SAVE INSTALL)
    /*if (dto.installDetail && Object.keys(dto.installDetail).length) {
      await this.prisma.fMInstallDetail.create({
        data: {
          ...dto.installDetail,
          preinstallId: preinstall.id,
        },
      });
    }*/
    if (dto.installDetail && Object.keys(dto.installDetail).length) {
      const i = dto.installDetail;

      const cleanInstall = {
        installType: i.installType ?? null,
        fmUnitType: i.fmUnitType ?? null,
        fmUnitCode: i.fmUnitCode ?? null,
        modem4G: i.modem4G ?? null,
        serviceCode: i.serviceCode ?? null,
        mixCode: i.mixCode ?? null,
        mixOrgId: i.mixOrgId ?? null,

        mixSim1: i.mixSim1 ?? null,
        sim1Type: i.sim1Type ?? null,
        unitSim: i.unitSim ?? null,
        unitSerial: i.unitSerial ?? null,
        unitIMEI: i.unitIMEI ?? null,

        visionType: i.visionType ?? null,
        cameraType: i.cameraType ?? null,
        cameraCount: i.cameraCount ?? null,

        mixSim2: i.mixSim2 ?? null,
        sim2Type: i.sim2Type ?? null,
        visSim: i.visSim ?? null,
        visIMEI: i.visIMEI ?? null,
        vis1Serial: i.vis1Serial ?? null,
        vis2Serial: i.vis2Serial ?? null,
        vis3Serial: i.vis3Serial ?? null,
        vis4Serial: i.vis4Serial ?? null,

        aiOption: i.aiOption ?? null,
        tmaOption: i.tmaOption ?? null,
        rimOption: i.rimOption ?? null,

        assetNumber: i.assetNumber != null ? String(i.assetNumber) : null,
        fleetNumber: i.fleetNumber ?? null,

        vehicleMake: i.vehicleMake ?? null,
        vehicleModel: i.vehicleModel ?? null,
        yearVariant: i.yearVariant ?? null,
        vinNumber: i.vinNumber ?? null,
        regoNumber: i.regoNumber ?? null,

        installLocation: i.installLocation ?? null,
        installer: i.installer ?? null,
        installStatus: i.installStatus ?? null,

        installDate: i.installDate
          ? (() => {
            const d = new Date(i.installDate);
            return isNaN(d.getTime()) ? null : d;
          })()
          : null,
      };

      await this.prisma.fMInstallDetail.create({
        data: {
          ...cleanInstall,
          preinstallId: preinstall.id,
          fMInstallDetailOrgIds: {
            createMany: {
              data: i?.organizations ? i?.organizations.map((item: { id: any; }) => ({
                orgId: item.id
              })) : []
            }
          }
        },
      });
    }
    return preinstall;
  }

  async list(query?: any) {
    const and: any[] = [{ deletedAt: null }];

    if (query?.status) {
      and.push({ status: query.status });
    } else if (query?.excludeCompleted === 'true') {
      // Exclude COMPLETED and INVOICED when checkbox is ticked
      and.push({
        status: { notIn: ['COMPLETED', 'INVOICED'] },
      });
    }

    if (query?.installType) {
      and.push({ type: query.installType });
    }

    if (query?.customer) {
      and.push({ customerId: query.customer });
    }

    if (query?.search) {
      and.push({
        OR: [
          { preinstallNo: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query?.fleet) {
      and.push({
        installDetail: { fleetNumber: { contains: query.fleet, mode: 'insensitive' } },
      });
    }

    if (query?.unitCode) {
      and.push({
        installDetail: { fmUnitCode: query.unitCode },
      });
    }

    if (query?.serviceCode) {
      and.push({
        installDetail: { serviceCode: query.serviceCode },
      });
    }

    if (query?.visionOnly === 'true') {
      and.push({
        installDetail: { visionType: { not: null } },
      });
    }

    if (query?.filter_preinstallNo) {
      and.push({ preinstallNo: { in: query.filter_preinstallNo.split(',') } });
    }
    if (query?.filter_serviceCode) {
      and.push({ installDetail: { serviceCode: { in: query.filter_serviceCode.split(',') } } });
    }
    if (query?.filter_unitCode) {
      and.push({ installDetail: { fmUnitCode: { in: query.filter_unitCode.split(',') } } });
    }
    if (query?.filter_fleetName) {
      and.push({ installDetail: { fleetNumber: { in: query.filter_fleetName.split(',') } } });
    }
    if (query?.filter_status) {
      and.push({ status: { in: query.filter_status.split(',') } });
    }
    if (query?.filter_customer) {
      and.push({ customer: { name: { in: query.filter_customer.split(',') } } });
    }

    const where = { AND: and };

    let orderBy: any = { createdAt: 'desc' };
    if (query?.sortKey) {
      const dir = query.sortDir === 'desc' ? 'desc' : 'asc';
      switch (query.sortKey) {
        case 'createdAt': orderBy = { createdAt: dir }; break;
        case 'preinstallNo': orderBy = { preinstallNo: dir }; break;
        case 'customer':
        case 'cusNum': orderBy = { customer: { name: dir } }; break;
        case 'fleetName':
        case 'fleetNum': orderBy = { installDetail: { fleetNumber: dir } }; break;
        case 'serviceCode': orderBy = { installDetail: { serviceCode: dir } }; break;
        case 'unitCode': orderBy = { installDetail: { fmUnitCode: dir } }; break;
        case 'rego': orderBy = { installDetail: { regoNumber: dir } }; break;
        case 'assetId': orderBy = { installDetail: { assetNumber: dir } }; break;
        default: orderBy = { createdAt: 'desc' };
      }
    }

    const page = Number(query?.page || 1);
    const pageSize = Number(query?.pageSize || 10);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fMPreinstall.findMany({
        where,
        include: {
          customer: true,
          fmCustomer: true,
          installDetail: true,
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.fMPreinstall.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.fMPreinstall.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Preinstall not found');
    }
    let newStatus = existing.status;
    //HANDLE STATUS CHANGE
    if (dto.status && dto.status !== existing.status) {
      const allowed = allowedTransitions[existing.status] || [];
      if (!allowed.includes(dto.status)) {
        throw new Error(
          `Invalid status transition from ${existing.status} to ${dto.status}`,
        );
      }
      newStatus = dto.status;
      //WORKFLOW TRIGGER
      await this.handleStatusChange(id, existing.status, dto.status);
    }

    //UPDATE MAIN RECORD
    const updated = await this.prisma.fMPreinstall.update({
      where: { id },
      data: {
        type: dto.type,
        status: newStatus,

        shippingName: dto.shippingName,
        shippingAddress1: dto.shippingAddress1 ?? dto.address1,
        shippingAddress2: dto.shippingAddress2 ?? dto.city,
        shippingAddress3: dto.shippingAddress3 ?? dto.state,

        billingName: dto.billingName,
        billingAddress1: dto.billingAddress1 ?? dto.address1,
        billingAddress2: dto.billingAddress2 ?? dto.city,
        billingAddress3: dto.billingAddress3 ?? dto.state,
        notes: dto?.notes || "",
        ...(dto.assignedUserId !== undefined && {
          assignedUserId: dto.assignedUserId || null,
        }),

        ...(dto.customerId && {
          customer: { connect: { id: dto.customerId } },
        }),

        ...(dto.fmCustomerId && {
          fmCustomer: { connect: { id: dto.fmCustomerId } },
        }),
      },
    });

    //INSTALL DETAIL UPSERT
    if (dto.installDetail && Object.keys(dto.installDetail).length) {
      const i = dto.installDetail;

      const cleanInstall = {
        // BASIC
        installType: i.installType ?? null,
        fmUnitType: i.fmUnitType ?? null,
        fmUnitCode: i.fmUnitCode ?? null,
        modem4G: i.modem4G ?? null,
        serviceCode: i.serviceCode ?? null,
        mixCode: i.mixCode ?? null,
        mixOrgId: i.mixOrgId ?? null,

        // MONITOR
        mixSim1: i.mixSim1 ?? null,
        sim1Type: i.sim1Type ?? null,
        unitSim: i.unitSim ?? null,
        unitSerial: i.unitSerial ?? null,
        unitIMEI: i.unitIMEI ?? null,

        // VISION
        visionType: i.visionType ?? null,
        cameraType: i.cameraType ?? null,
        cameraCount: i.cameraCount ?? null,

        // SIM2 / VISION DETAILS
        mixSim2: i.mixSim2 ?? null,
        sim2Type: i.sim2Type ?? null,
        visSim: i.visSim ?? null,
        visIMEI: i.visIMEI ?? null,
        vis1Serial: i.vis1Serial ?? null,
        vis2Serial: i.vis2Serial ?? null,
        vis3Serial: i.vis3Serial ?? null,
        vis4Serial: i.vis4Serial ?? null,

        // OPTIONS
        aiOption: i.aiOption ?? null,
        tmaOption: i.tmaOption ?? null,
        rimOption: i.rimOption ?? null,

        // ASSET
        assetNumber: i.assetNumber != null ? String(i.assetNumber) : null,
        fleetNumber: i.fleetNumber ?? null,

        // VEHICLE
        vehicleMake: i.vehicleMake ?? null,
        vehicleModel: i.vehicleModel ?? null,
        yearVariant: i.yearVariant ?? null,
        vinNumber: i.vinNumber ?? null,
        regoNumber: i.regoNumber ?? null,

        // INSTALLATION
        installLocation: i.installLocation ?? null,
        installer: i.installer ?? null,
        installStatus: i.installStatus ?? null,

        installDate: i.installDate
          ? (() => {
            const d = new Date(i.installDate);
            return isNaN(d.getTime()) ? null : d;
          })()
          : null,
      };

      const installDetail = await this.prisma.fMInstallDetail.upsert({
        where: { preinstallId: id },
        create: {
          ...cleanInstall,
          preinstallId: id,
        },
        update: cleanInstall,
      });

      await this.prisma.fMInstallDetailOrgIds.deleteMany({
        where: {
          fMInstallDetailId: installDetail.id
        }
      })

      await this.prisma.fMInstallDetailOrgIds.createMany({
        data: i?.organizations ? i?.organizations.map((item: { id: any; }) => ({
          orgId: item.id,
          fMInstallDetailId: installDetail.id
        })) : []
      })
    }

    return updated;
  }

  async updateItems(id: string, items: any[]) {
    // Skip rows with no product selected
    const validItems = items.filter(i => i.productId && i.productId !== '');

    await this.prisma.$transaction(async tx => {
      for (const item of validItems) {
        if (item.id) {
          await tx.fMPreinstallItem.update({
            where: { id: item.id },
            data: {
              productId: item.productId,
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              discountPct: item.discountPct ?? null,
              lineTotal: item.lineTotal ?? null,
            },
          });
        } else {
          await tx.fMPreinstallItem.create({
            data: {
              preinstallId: id,
              productId: item.productId,
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              discountPct: item.discountPct ?? null,
              lineTotal: item.lineTotal ?? null,
            },
          });
        }
      }
    });
  }

  async updateInstallDetail(preinstallId: string, dto: any) {
    return this.prisma.fMInstallDetail.upsert({
      where: { preinstallId },
      create: {
        preinstallId,
        ...dto,
      },
      update: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.fMPreinstall.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async generateNumber() {
    const count = await this.prisma.fMPreinstall.count();
    return `PI-${1000 + count + 1}`;
  }

  async getSegments(query: any) {
    const { type, dependsOn } = query;

    return this.prisma.fMServiceSegment.findMany({
      where: {
        isActive: true,

        ...(type && { type }),

        ...(dependsOn && {
          OR: [
            { dependsOn: dependsOn },
            { dependsOn: null },
          ],
        }),
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async createWorkshopJob(preinstallId: string) {
    // GET PREINSTALL WITH ALL DETAILS
    const preinstall = await this.prisma.fMPreinstall.findUnique({
      where: { id: preinstallId },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: true,
      },
    });

    if (!preinstall) throw new Error('Preinstall not found');

    // GET WORKSHOP BOARD
    const board = await this.prisma.jobBoard.findFirst({
      where: { name: 'Workshop' },
      include: { lists: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!board) throw new Error('Workshop board not found');

    // ENSURE REQUIRED LISTS EXIST — create if missing
    const requiredLists = [
      'Forward Orders',
      'Admin To Do',
      'To Be Done',
      'Sprint',
      'Workshop In Progress',
      'Waiting Install',
      'Installed',
      'Ready to Invoice',
    ];

    for (let i = 0; i < requiredLists.length; i++) {
      const name = requiredLists[i];
      const exists = board.lists.find((l: any) => l.name === name);
      if (!exists) {
        await this.prisma.jobList.create({
          data: {
            boardId: board.id,
            name,
            sortOrder: i + 1,
          },
        });
      }
    }

    // RELOAD LISTS AFTER ENSURE
    const updatedBoard = await this.prisma.jobBoard.findUnique({
      where: { id: board.id },
      include: { lists: { orderBy: { sortOrder: 'asc' } } },
    });

    // NEW PREINSTALLS GO INTO "Admin To Do"
    const targetList = updatedBoard.lists.find(
      (l: any) => l.name === 'Admin To Do',
    ) ?? updatedBoard.lists[0];

    if (!targetList) throw new Error('No list found in Workshop board');

    // BUILD CARD TITLE
    const installTypeLabel: Record<string, string> = {
      NEW_INSTALL: 'New Install',
      WARRANTY: 'Warranty',
      REPLACEMENT: 'Replacement',
      MODIFIED_INSTALL: 'Modified Install',
      TRANSFER_UNIT: 'Transfer Unit',
    };

    const title = [
      preinstall.preinstallNo,
      preinstall.customer?.name,
      installTypeLabel[preinstall.type] ?? preinstall.type,
    ]
      .filter(Boolean)
      .join(' — ');

    // BUILD CARD DESCRIPTION
    const d = preinstall.installDetail;
    const lines = [
      `FM Customer: ${preinstall.fmCustomer?.fmWebNumber ?? '-'}`,
      `Unit Type: ${d?.fmUnitType ?? '-'}`,
      `Unit Code: ${d?.fmUnitCode ?? '-'}`,
      `Service Code: ${d?.serviceCode ?? '-'}`,
      `Asset: ${d?.assetNumber ?? '-'} | Fleet: ${d?.fleetNumber ?? '-'}`,
      `Rego: ${d?.regoNumber ?? '-'} | VIN: ${d?.vinNumber ?? '-'}`,
      `Vehicle: ${d?.vehicleMake ?? '-'} ${d?.vehicleModel ?? '-'} ${d?.yearVariant ?? ''}`.trim(),
      `Location: ${d?.installLocation ?? '-'}`,
      `Installer: ${d?.installer ?? '-'}`,
      `Install Date: ${d?.installDate ? new Date(d.installDate).toLocaleDateString('en-AU') : '-'}`,
      ``,
      `Preinstall ID: ${preinstall.id}`,  // used to link back
    ];

    const description = lines.join('\n');

    // CREATE CARD
    const card = await this.jobBoardsService.createCard(targetList.id, {
      title,
      description,
    });

    return card;
  }

  async createInstallationJob(preinstallId: string) {
    // Find existing card linked to this preinstall
    const preinstall = await this.prisma.fMPreinstall.findUnique({
      where: { id: preinstallId },
    });

    if (!preinstall) throw new Error('Preinstall not found');

    // If card already exists, move it to "Installed" list
    if (preinstall.jobId) {
      const board = await this.prisma.jobBoard.findFirst({
        where: { name: 'Workshop' },
        include: { lists: { orderBy: { sortOrder: 'asc' } } },
      });

      const installedList = board?.lists.find((l: any) => l.name === 'Installed');

      if (installedList && preinstall.jobId) {
        await this.prisma.jobCard.update({
          where: { id: preinstall.jobId },
          data: { listId: installedList.id },
        });
      }

      return { id: preinstall.jobId }; // return existing card
    }

    // Fallback — create new card if no jobId exists
    const board = await this.prisma.jobBoard.findFirst({
      where: { name: 'Workshop' },
      include: { lists: { orderBy: { sortOrder: 'asc' } } },
    });

    const installedList = board?.lists.find((l: any) => l.name === 'Installed')
      ?? board?.lists[0];

    if (!installedList) throw new Error('No Installed list found');

    const card = await this.jobBoardsService.createCard(installedList.id, {
      title: `Install ${preinstallId}`,
    });

    return card;
  }

  async handleStatusChange(preinstallId: string, from: string, to: string) {
    console.log('STATUS CHANGE TRIGGERED:', from, '→', to);
    // WORKSHOP JOB
    if (to === 'WORKSHOP_SETUP') {
      const card = await this.createWorkshopJob(preinstallId);

      await this.prisma.fMPreinstall.update({
        where: { id: preinstallId },
        data: { jobId: card.id },
      });
    }

    //INSTALLATION JOB
    if (to === 'INSTALLED') {
      const card = await this.createInstallationJob(preinstallId);

      await this.prisma.fMPreinstall.update({
        where: { id: preinstallId },
        data: { installJobId: card.id },
      });
    }
  }

}