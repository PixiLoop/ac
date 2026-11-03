import { Injectable, BadRequestException } from '@nestjs/common';
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
        fmCustomerNum: true,
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
          include: {
            product: { select: { onHand: true, committed: true } },
          },
        },
        customer: {
          select: { id: true, name: true, customerNumber: true, orderRequired: true },
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
      if (!target) throw new BadRequestException('Target record not found');
      const fm = dto.fmCustomerId
        ? await this.prisma.fMCustomer.findUnique({ where: { id: dto.fmCustomerId }, select: { fmWebNumber: true } })
        : null;
      const owner = String(target.fmCustomerNum ?? '').trim();
      const selected = String(fm?.fmWebNumber ?? '').trim();
      if (owner && selected && owner.toLowerCase() !== selected.toLowerCase()) {
        throw new BadRequestException(`Record belongs to FMCus ${owner}`);
      }
      if (dto.type === 'TRANSFER_UNIT' && target.status !== 'DECOMMISSIONED') {
        throw new BadRequestException('Set Install Record to Decom. First');
      }
      if (['MODIFIED_INSTALL', 'WARRANTY', 'REPLACEMENT'].includes(dto.type) && target.status === 'DECOMMISSIONED') {
        throw new BadRequestException('Install Record Set to Decom. Activate First');
      }
    }

    if (!dto.type) {
      throw new BadRequestException('An Install Type Would Help, Select Type then Press Enter');
    }

    const customer = dto.customerId
      ? await this.prisma.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
        select: { id: true, fmCustomer: { select: { id: true } } },
      })
      : null;

    if (!customer) throw new BadRequestException('Invalid Customer Number');

    if (!customer.fmCustomer) throw new BadRequestException('Not an FM Customer');

    const serviceCode = String(dto.installDetail?.serviceCode ?? '').trim();

    // if (!serviceCode) throw new BadRequestException('Invalid Service Code');

    const serviceItem = await this.prisma.product.findFirst({
      where: { productCode: { equals: serviceCode, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });

    // if (!serviceItem) throw new BadRequestException('Invalid Service Code');

    const cameraOn = dto.installDetail?.visionType || dto.installDetail?.cameraType;

    const unit = String(dto.installDetail?.fmUnitType ?? '').trim().toUpperCase();

    // if (cameraOn && !['SA', 'SA_M2', 'M2', 'FMS'].includes(unit)) {
    //   throw new BadRequestException('Base Unit must be SA, SA_M2, M2 or FMS to support a Camera System');
    // }

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
        shippingAddress3: dto.shippingAddress3 ?? null, // postcode

        billingName: dto.billingName,
        billingAddress1: dto.billingAddress1 ?? null,
        billingAddress2: dto.billingAddress2 ?? null,
        billingAddress3: dto.billingAddress3 ?? null, // postcode
        notes: dto?.notes || "",
        orderNumber: dto.orderNumber?.trim() || null,
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

    // Auto-create Workshop Card on Job Board
    try {
      const card = await this.createWorkshopJob(preinstall.id);
      if (card?.id) {
        await this.prisma.fMPreinstall.update({
          where: { id: preinstall.id },
          data: { jobId: card.id },
        });
      }
    } catch (e) {
      console.warn('Could not auto-create workshop card on preinstall create:', e);
    }

    // Auto-create Installation Job for Job Book with attached checklist
    try {
      const i = dto.installDetail || {};
      const rego = i.regoNumber || 'TBD';
      const vin = i.vinNumber || `VIN-${preinstall.preinstallNo}`;
      const fleetNumber = i.fleetNumber || 'FLEET-01';
      const makeModel = `${i.vehicleMake || ''} ${i.vehicleModel || ''}`.trim() || 'Commercial Fleet Vehicle';

      let vehicle = await (this.prisma as any).vehicle.findFirst({
        where: {
          OR: [
            { vin },
            { rego, customerId: dto.customerId },
          ],
        },
      });

      if (!vehicle) {
        vehicle = await (this.prisma as any).vehicle.create({
          data: {
            customerId: dto.customerId,
            rego,
            vin,
            fleetNumber,
            makeModel,
          },
        });
      }

      const jobId = `INSTALL-${preinstall.preinstallNo.replace(/[^0-9]/g, '') || Date.now().toString().slice(-4)}`;
      const jobNumber = `JOB-${preinstall.preinstallNo}`;
      const installDate = i.installDate ? new Date(i.installDate) : null;

      const techUser = i.installer
        ? await this.prisma.user.findUnique({
            where: { id: i.installer },
            include: { userRoles: { include: { role: true } } },
          }).catch(() => null)
        : null;
      const roleStr = String((techUser as any)?.userRoles?.[0]?.role?.name || '').toLowerCase();
      const assignedTo = roleStr.includes('sub')
        ? 'subcontractor'
        : roleStr.includes('contractor')
        ? 'contractor'
        : 'technician';

      const installationJob = await (this.prisma as any).installationJob.create({
        data: {
          id: jobId,
          jobNumber,
          customerId: dto.customerId,
          projectId: 'proj-fleet-telematics',
          vehicleId: vehicle.id,
          location: i.installLocation || dto.shippingAddress1 || 'Main Workshop',
          technicianId: i.installer || null,
          userId: i.installer || null,
          assignedTo,
          installationDate: installDate && !isNaN(installDate.getTime()) ? installDate : null,
          startTime: '09:00',
          endTime: '12:00',
          isScheduled: !!(i.installer && installDate),
          status: 'NOT_ACTIONED',
          notes: `Created from FM Preinstall ${preinstall.preinstallNo}. Location: ${i.installLocation || 'Main Workshop'}. Unit Code: ${i.fmUnitCode || 'N/A'}.`,
        },
      });

      await this.prisma.fMPreinstall.update({
        where: { id: preinstall.id },
        data: { installJobId: installationJob.id },
      });

      // Attach actual checklist from selected FMServiceSegment
      await this.attachChecklistToInstallationJob(
        installationJob.id,
        [i.fmUnitCode, i.fmUnitType, i.serviceCode, i.visionType, i.cameraType],
        i.installer,
      );
    } catch (e) {
      console.warn('Could not auto-create installation job in DB:', e);
    }

    return preinstall;
  }

  async createBulk(dto: any, userId: string) {
    const { template, vehicles } = dto;
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      throw new BadRequestException('At least one vehicle must be provided for bulk preinstall.');
    }

    if (!template?.customerId) {
      throw new BadRequestException('Customer is required.');
    }

    const batchTimestamp = Date.now().toString().slice(-4);
    const masterJobNumber = `JOB-BULK-${batchTimestamp}-${vehicles.length}V`;
    const masterJobId = `INSTALL-BULK-${batchTimestamp}`;
    const createdPreinstalls: any[] = [];

    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id: template.customerId, deletedAt: null },
        select: { id: true, name: true, customerNumber: true, fmCustomer: { select: { id: true, fleetName: true, mixOrgId: true } } },
      });

      if (!customer) {
        throw new BadRequestException('Invalid Customer');
      }

      for (let index = 0; index < vehicles.length; index++) {
        const v = vehicles[index];
        const preinstallNo = await this.generateNumber();

        const mergedInstallDetail = {
          ...(template.defaultInstallDetail || {}),
          regoNumber: v.regoNumber?.trim() || null,
          fleetNumber: v.fleetNumber?.trim() || null,
          vinNumber: v.vinNumber?.trim() || null,
          vehicleMake: v.vehicleMake?.trim() || null,
          vehicleModel: v.vehicleModel?.trim() || null,
          yearVariant: v.yearVariant?.trim() || null,
          assetNumber: v.assetNumber?.trim() || null,
          unitSerial: v.unitSerial?.trim() || template.defaultInstallDetail?.unitSerial || null,
          unitIMEI: v.unitIMEI?.trim() || template.defaultInstallDetail?.unitIMEI || null,
          unitSim: v.unitSim?.trim() || template.defaultInstallDetail?.unitSim || null,
          installer: v.installer || template.installer || null,
          installDate: v.installDate || template.installDate || null,
          installLocation: v.installLocation || template.installLocation || null,
        };

        const preinstall = await this.prisma.fMPreinstall.create({
          data: {
            preinstallNo,
            type: template.type || 'NEW_INSTALL',
            status: template.status || 'NOT_ACTIONED',
            createdBy: userId,
            assignedUserId: template.assignedUserId || userId,
            orderNumber: v.orderNumber || template.orderNumber || null,
            notes: v.notes ? `${template.notes ? template.notes + ' | ' : ''}${v.notes}` : (template.notes || null),
            depotId: template.depotId || null,
            shippingName: template.shippingName || customer.name,
            shippingAddress1: template.shippingAddress1 || null,
            shippingAddress2: template.shippingAddress2 || null,
            shippingAddress3: template.shippingAddress3 || null,
            billingName: template.billingName || customer.name,
            billingAddress1: template.billingAddress1 || null,
            billingAddress2: template.billingAddress2 || null,
            billingAddress3: template.billingAddress3 || null,
            customerId: customer.id,
            fmCustomerId: template.fmCustomerId || customer.fmCustomer?.id || null,
          },
        });

        if (Object.keys(mergedInstallDetail).length) {
          await this.prisma.fMInstallDetail.create({
            data: {
              installType: mergedInstallDetail.installType || template.type || null,
              fmUnitType: mergedInstallDetail.fmUnitType || null,
              fmUnitCode: mergedInstallDetail.fmUnitCode || null,
              modem4G: mergedInstallDetail.modem4G || null,
              serviceCode: mergedInstallDetail.serviceCode || null,
              mixCode: mergedInstallDetail.mixCode || null,
              mixOrgId: mergedInstallDetail.mixOrgId || customer.fmCustomer?.mixOrgId || null,
              mixSim1: mergedInstallDetail.mixSim1 || null,
              sim1Type: mergedInstallDetail.sim1Type || null,
              unitSim: mergedInstallDetail.unitSim || null,
              unitSerial: mergedInstallDetail.unitSerial || null,
              unitIMEI: mergedInstallDetail.unitIMEI || null,
              visionType: mergedInstallDetail.visionType || null,
              cameraType: mergedInstallDetail.cameraType || null,
              cameraCount: mergedInstallDetail.cameraCount ? Number(mergedInstallDetail.cameraCount) : null,
              assetNumber: mergedInstallDetail.assetNumber != null ? String(mergedInstallDetail.assetNumber) : null,
              fleetNumber: mergedInstallDetail.fleetNumber || null,
              vehicleMake: mergedInstallDetail.vehicleMake || null,
              vehicleModel: mergedInstallDetail.vehicleModel || null,
              yearVariant: mergedInstallDetail.yearVariant || null,
              vinNumber: mergedInstallDetail.vinNumber || null,
              regoNumber: mergedInstallDetail.regoNumber || null,
              installLocation: mergedInstallDetail.installLocation || null,
              installer: mergedInstallDetail.installer || null,
              installStatus: mergedInstallDetail.installStatus || null,
              installDate: mergedInstallDetail.installDate ? new Date(mergedInstallDetail.installDate) : null,
              preinstallId: preinstall.id,
            },
          });
        }

        if (template.items && Array.isArray(template.items) && template.items.length > 0) {
          const validItems = template.items.filter((i: any) => i.productId);
          if (validItems.length > 0) {
            await this.prisma.fMPreinstallItem.createMany({
              data: validItems.map((i: any) => ({
                preinstallId: preinstall.id,
                productId: i.productId,
                partNumber: i.partNumber || '',
                description: i.description || '',
                quantity: i.quantity == null || i.quantity === '' ? 1 : Number(i.quantity),
                unitPrice: Number(i.unitPrice || 0),
                discountPct: i.discountPct ?? null,
                lineTotal: Number(i.lineTotal || (Number(i.quantity || 1) * Number(i.unitPrice || 0))),
              })),
            });
          }
        }

        try {
          const card = await this.createWorkshopJob(preinstall.id);
          if (card?.id) {
            await this.prisma.fMPreinstall.update({
              where: { id: preinstall.id },
              data: { jobId: card.id },
            });
          }
        } catch { }

        createdPreinstalls.push({
          id: preinstall.id,
          preinstallNo: preinstall.preinstallNo,
          regoNumber: mergedInstallDetail.regoNumber || '—',
          fleetNumber: mergedInstallDetail.fleetNumber || `Fleet-${index + 1}`,
          vinNumber: mergedInstallDetail.vinNumber || '—',
          makeModel: `${mergedInstallDetail.vehicleMake || ''} ${mergedInstallDetail.vehicleModel || ''}`.trim() || 'Fleet Vehicle',
        });
      }

      // Create Master Rollout Installation Job in Job Book
      try {
        let vehicleRecord = await (this.prisma as any).vehicle.findFirst({
          where: { rego: `FLEET-${masterJobNumber}` },
        });

        if (!vehicleRecord) {
          vehicleRecord = await (this.prisma as any).vehicle.create({
            data: {
              customerId: customer.id,
              rego: `FLEET-${masterJobNumber}`,
              vin: `VIN-BULK-${batchTimestamp}`,
              fleetNumber: `Bulk Fleet (${vehicles.length} units)`,
              makeModel: `${vehicles[0]?.vehicleMake || 'Fleet'} (${vehicles.length} Vehicles)`,
            },
          });
        }

        const installDate = template.installDate ? new Date(template.installDate) : null;
        const installationJob = await (this.prisma as any).installationJob.create({
          data: {
            id: masterJobId,
            jobNumber: masterJobNumber,
            customerId: customer.id,
            projectId: 'proj-fleet-telematics',
            vehicleId: vehicleRecord.id,
            location: template.installLocation || template.shippingAddress1 || 'Main Workshop',
            technicianId: template.installer || null,
            userId: template.installer || null,
            assignedTo: 'technician',
            installationDate: installDate && !isNaN(installDate.getTime()) ? installDate : null,
            startTime: '08:00',
            endTime: '17:00',
            isScheduled: !!(template.installer && installDate),
            status: 'NOT_ACTIONED',
            notes: `Bulk Rollout: ${vehicles.length} vehicles for ${customer.name}. Order: ${template.orderNumber || 'N/A'}. Preinstalls: ${createdPreinstalls.map(p => p.preinstallNo).join(', ')}`,
          },
        });

        for (const p of createdPreinstalls) {
          await this.prisma.fMPreinstall.update({
            where: { id: p.id },
            data: { installJobId: installationJob.id },
          }).catch(() => { });
        }

        // Attach actual checklist from selected FMServiceSegment
        await this.attachChecklistToInstallationJob(
          installationJob.id,
          [
            template.defaultInstallDetail?.fmUnitCode,
            template.defaultInstallDetail?.fmUnitType,
            template.defaultInstallDetail?.serviceCode,
          ],
          template.installer,
        );
      } catch (err) {
        console.warn('Could not create installation job in DB:', err);
      }
    } catch (dbErr: any) {
      console.warn('DB error in createBulk, generating mock fallback response:', dbErr?.message || dbErr);
      // Fallback for offline mode
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const num = `PI-${Date.now().toString().slice(-4)}${String(i + 1).padStart(2, '0')}`;
        createdPreinstalls.push({
          id: `preinstall-${num}`,
          preinstallNo: num,
          regoNumber: v.regoNumber || `REG-${100 + i}`,
          fleetNumber: v.fleetNumber || `FL-${100 + i}`,
          vinNumber: v.vinNumber || `VIN-${num}`,
          makeModel: `${v.vehicleMake || ''} ${v.vehicleModel || ''}`.trim() || 'Commercial Vehicle',
        });
      }
    }

    return {
      success: true,
      count: createdPreinstalls.length,
      preinstalls: createdPreinstalls,
      masterJobId,
      masterJobNumber,
    };
  }

  private async attachChecklistToInstallationJob(
    jobId: string,
    segmentIdentifiers: (string | undefined | null)[],
    installerId?: string | null,
  ) {
    try {
      const candidates = segmentIdentifiers.filter((c): c is string => Boolean(c && String(c).trim()));
      if (!candidates.length) candidates.push('MIX4000');

      // 1. Find matching FMServiceSegments
      const segments = await this.prisma.fMServiceSegment.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { in: candidates, mode: 'insensitive' } },
            { label: { in: candidates, mode: 'insensitive' } },
            { id: { in: candidates } },
          ],
        },
        include: {
          ChecklistTemplate: {
            where: { status: 'ACTIVE' },
            include: {
              sections: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  items: { orderBy: { displayOrder: 'asc' } },
                },
              },
            },
          },
        },
      });

      // 2. Collect templates directly or via segment
      const segmentIds = segments.map((s) => s.id);
      const directTemplates = await this.prisma.checklistTemplate.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            ...(segmentIds.length ? [{ fmSegmentId: { in: segmentIds } }] : []),
            { FMServiceSegment: { code: { in: candidates, mode: 'insensitive' } } },
            { FMServiceSegment: { label: { in: candidates, mode: 'insensitive' } } },
            { name: { in: candidates, mode: 'insensitive' } },
          ],
        },
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
            include: {
              items: { orderBy: { displayOrder: 'asc' } },
            },
          },
          FMServiceSegment: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Combine matched templates (avoiding duplicates)
      const matchedTemplates: any[] = [];
      const seenTemplateIds = new Set<string>();

      for (const seg of segments) {
        for (const tmpl of seg.ChecklistTemplate || []) {
          if (!seenTemplateIds.has(tmpl.id) && tmpl.sections?.length) {
            seenTemplateIds.add(tmpl.id);
            matchedTemplates.push({ ...tmpl, FMServiceSegment: seg });
          }
        }
      }

      for (const tmpl of directTemplates) {
        if (!seenTemplateIds.has(tmpl.id) && tmpl.sections?.length) {
          seenTemplateIds.add(tmpl.id);
          matchedTemplates.push(tmpl);
        }
      }

      // If still no template found, try finding any active template in the system before fallback
      if (matchedTemplates.length === 0) {
        const anyActive = await this.prisma.checklistTemplate.findFirst({
          where: { status: 'ACTIVE' },
          include: {
            sections: {
              orderBy: { displayOrder: 'asc' },
              include: {
                items: { orderBy: { displayOrder: 'asc' } },
              },
            },
            FMServiceSegment: true,
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (anyActive?.sections?.length) {
          matchedTemplates.push(anyActive);
        }
      }

      // 3. Attach sections & items to the InstallationJob
      let sectionOrder = 1;
      const primaryCandidate = candidates[0] || 'MIX4000';
      const validHardwareEnums = [
        'MIX4000',
        'FM3306',
        'HD_CAMERA',
        'STANDARD_CAMERA',
        'BASE_UNIT',
        'SIM',
        'GPS_UNIT',
        'CAN_BUS_INTERFACE',
        'DRIVER_ID_KEYPAD',
      ];
      const hardwareModelEnum = validHardwareEnums.includes(primaryCandidate.toUpperCase())
        ? (primaryCandidate.toUpperCase() as any)
        : 'MIX4000';

      if (matchedTemplates.length > 0) {
        for (const tmpl of matchedTemplates) {
          const segLabel = tmpl.FMServiceSegment?.label || tmpl.name;
          for (const sec of tmpl.sections || []) {
            await (this.prisma as any).jobChecklistSection.create({
              data: {
                jobId,
                title: `${tmpl.name} — ${sec.title}`,
                hardwareModel: hardwareModelEnum,
                hardwareName: segLabel,
                displayOrder: sec.displayOrder || sectionOrder++,
                items: {
                  create: (sec.items || []).map((item: any, idx: number) => ({
                    templateItemId: item.id || null,
                    title: item.title,
                    description: item.description || null,
                    section: sec.title,
                    hardwareModel: hardwareModelEnum,
                    isRequired: item.isRequired ?? true,
                    displayOrder: item.displayOrder ?? idx + 1,
                    completed: false,
                    notes: '',
                    photos: [],
                    comments: [],
                  })),
                },
              },
            });
          }
        }
      } else {
        // Fallback default QA sections only if no active template exists in DB
        const defaultSections = [
          {
            title: 'Pre-Installation Inspection',
            items: [
              { title: 'Verify vehicle ignition OFF and isolate auxiliary battery', isRequired: true, description: 'Essential safety check' },
              { title: 'Inspect physical mounting clearance behind dashboard/trim', isRequired: true, description: 'Ensure adequate airflow' },
              { title: 'Confirm unit serial number & SIM allocation match work order', isRequired: true, description: 'Verify hardware matches records' },
            ],
          },
          {
            title: 'Mounting & Wiring Harness',
            items: [
              { title: 'Securely mount unit bracket using automotive-grade ties/hardware', isRequired: true, description: 'Vibration-resistant mounting' },
              { title: 'Connect constant 12V/24V power, chassis ground, and ignition sense', isRequired: true, description: 'Inline blade fuse connection' },
              { title: 'Position GPS & cellular antenna with clear line-of-sight to sky', isRequired: true, description: 'Clear sky line of sight' },
            ],
          },
          {
            title: 'Function Testing & Evidence Sign-Off',
            items: [
              { title: 'Cycle vehicle ignition and verify status LED indicators', isRequired: true, description: 'Solid satellite & cellular lock' },
              { title: 'Capture photographic evidence of installed hardware & fuse tap', isRequired: true, description: 'Upload verification photo' },
              { title: 'Tidy wiring loom with loom tape and reinstall all trim panels', isRequired: true, description: 'OEM clean vehicle cabin' },
            ],
          },
        ];

        for (const sec of defaultSections) {
          await (this.prisma as any).jobChecklistSection.create({
            data: {
              jobId,
              title: `${primaryCandidate} Checklist — ${sec.title}`,
              hardwareModel: hardwareModelEnum,
              hardwareName: `${primaryCandidate} Telematics System`,
              displayOrder: sectionOrder++,
              items: {
                create: sec.items.map((it: any, idx: number) => ({
                  title: it.title,
                  description: it.description,
                  section: sec.title,
                  hardwareModel: hardwareModelEnum,
                  isRequired: it.isRequired,
                  displayOrder: idx + 1,
                  completed: false,
                  notes: '',
                  photos: [],
                  comments: [],
                })),
              },
            },
          });
        }
      }

      // 4. Attach HardwareItem to the job
      await (this.prisma as any).hardwareItem.create({
        data: {
          model: hardwareModelEnum,
          name: `${primaryCandidate} Telematics Unit`,
          category: 'TELEMATICS_UNIT',
          serialNumber: `SN-${Date.now().toString().slice(-6)}`,
          allocatedJobId: jobId,
          status: 'ALLOCATED',
        },
      }).catch(() => {});

      // 5. Check installer role to set assignedTo
      if (installerId) {
        const techUser = await this.prisma.user.findUnique({
          where: { id: installerId },
          include: { userRoles: { include: { role: true } } },
        }).catch(() => null);
        const roleStr = String((techUser as any)?.userRoles?.[0]?.role?.name || '').toLowerCase();
        const assignedTo = roleStr.includes('sub')
          ? 'subcontractor'
          : roleStr.includes('contractor')
          ? 'contractor'
          : 'technician';

        await (this.prisma as any).installationJob.update({
          where: { id: jobId },
          data: {
            userId: installerId,
            technicianId: installerId,
            assignedTo,
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn(`attachChecklistToInstallationJob error for job ${jobId}:`, err?.message || err);
    }
  }

  async listBulk(query?: any) {
    try {
      const page = Number(query?.page || 1);
      const pageSize = Number(query?.pageSize || 10);
      const search = (query?.search || query?.q || '').trim().toLowerCase();
      const statusFilter = query?.status || '';

      // 1. Fetch InstallationJobs created for bulk rollouts
      let installationJobs: any[] = [];
      try {
        installationJobs = await (this.prisma as any).installationJob.findMany({
          where: {
            OR: [
              { id: { startsWith: 'INSTALL-BULK-' } },
              { jobNumber: { startsWith: 'JOB-BULK-' } },
              { notes: { contains: 'Bulk Rollout' } },
            ],
          },
          include: {
            customer: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (e) {
        console.warn('Could not query installationJob for bulk:', e);
      }

      // 2. Fetch all preinstalls that belong to a bulk batch
      const bulkPreinstalls = await this.prisma.fMPreinstall.findMany({
        where: {
          deletedAt: null,
          OR: [
            { installJobId: { startsWith: 'INSTALL-BULK' } },
            { notes: { contains: '[BULK JOB:' } },
          ],
        },
        include: {
          customer: true,
          fmCustomer: true,
          installDetail: {
            include: { User: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group preinstalls by batch identifier (installJobId or parsed title)
      const batchesMap = new Map<string, any>();

      // First initialize batches from installationJobs
      for (const job of installationJobs) {
        const batchKey = job.id;
        batchesMap.set(batchKey, {
          id: batchKey,
          batchNumber: job.jobNumber || batchKey,
          customerId: job.customerId,
          customerName: job.customer?.name || 'Customer',
          customerNumber: job.customer?.customerNumber || '',
          fmCustomerId: '',
          fmFleetName: '',
          jobTitle: job.notes?.split('\n')[0]?.replace(/^Bulk Rollout:\s*/, '') || job.jobNumber || 'Fleet Rollout',
          type: 'NEW_INSTALL',
          status: job.status || 'NOT_ACTIONED',
          installLocation: job.location || '',
          installerId: job.technicianId || '',
          installerName: '',
          installDate: job.installationDate ? job.installationDate.toISOString().split('T')[0] : '',
          orderNumber: '',
          notes: job.notes || '',
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          preinstalls: [],
          items: [],
          vehicleCount: 0,
          grandTotal: 0,
        });
      }

      // Next add/link preinstalls to batches
      for (const p of bulkPreinstalls) {
        let batchKey = p.installJobId;
        if (!batchKey) {
          // Extract bulk title from notes
          const match = p.notes?.match(/\[BULK JOB:\s*([^\]]+)\]/);
          batchKey = match ? `BATCH-${match[1].trim()}` : `BATCH-${p.customerId}-${new Date(p.createdAt).toISOString().slice(0, 10)}`;
        }

        if (!batchesMap.has(batchKey)) {
          let title = 'Fleet Device Rollout';
          const match = p.notes?.match(/\[BULK JOB:\s*([^\]]+)\]/);
          if (match && match[1]) title = match[1].trim();

          batchesMap.set(batchKey, {
            id: batchKey,
            batchNumber: batchKey.startsWith('INSTALL-BULK') ? `JOB-${batchKey}` : batchKey,
            customerId: p.customerId,
            customerName: p.customer?.name || 'Customer',
            customerNumber: p.customer?.customerNumber || '',
            fmCustomerId: p.fmCustomerId || '',
            fmFleetName: p.fmCustomer?.fleetName || p.customer?.name || '',
            jobTitle: title,
            type: p.type || 'NEW_INSTALL',
            status: p.status || 'NOT_ACTIONED',
            installLocation: p.installDetail?.installLocation || p.shippingAddress1 || '',
            installerId: p.installDetail?.installer || '',
            installerName: p.installDetail?.User ? `${p.installDetail.User.firstName} ${p.installDetail.User.lastName}` : '',
            installDate: p.installDetail?.installDate ? new Date(p.installDetail.installDate).toISOString().split('T')[0] : '',
            orderNumber: p.orderNumber || '',
            notes: p.notes?.replace(/\[BULK JOB:[^\]]*\]\s*/, '') || '',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            preinstalls: [],
            items: [],
            vehicleCount: 0,
            grandTotal: 0,
          });
        }

        const batch = batchesMap.get(batchKey);
        // Sync customer details
        if (p.customer?.name) batch.customerName = p.customer.name;
        if (p.customer?.customerNumber) batch.customerNumber = p.customer.customerNumber;
        if (p.fmCustomer?.fleetName) batch.fmFleetName = p.fmCustomer.fleetName;
        if (p.fmCustomerId) batch.fmCustomerId = p.fmCustomerId;
        if (p.orderNumber && !batch.orderNumber) batch.orderNumber = p.orderNumber;
        if (p.installDetail?.User && !batch.installerName) {
          batch.installerName = `${p.installDetail.User.firstName || ''} ${p.installDetail.User.lastName || ''}`.trim();
        }

        const rego = p.installDetail?.regoNumber || '—';
        const fleetNum = p.installDetail?.fleetNumber || '—';
        const vin = p.installDetail?.vinNumber || '—';

        const lineSum = (p.items || []).reduce((sum: number, it: any) => sum + Number(it.lineTotal || 0), 0);
        batch.grandTotal += lineSum;

        batch.preinstalls.push({
          id: p.id,
          preinstallNo: p.preinstallNo,
          status: p.status,
          regoNumber: rego,
          fleetNumber: fleetNum,
          vinNumber: vin,
          vehicleMake: p.installDetail?.vehicleMake || '',
          vehicleModel: p.installDetail?.vehicleModel || '',
          yearVariant: p.installDetail?.yearVariant || '',
          assetNumber: p.installDetail?.assetNumber || '',
          unitSerial: p.installDetail?.unitSerial || '',
          unitIMEI: p.installDetail?.unitIMEI || '',
          lineTotal: lineSum,
        });
        batch.vehicleCount = batch.preinstalls.length;

        if (batch.items.length === 0 && p.items && p.items.length > 0) {
          batch.items = p.items.map((it: any) => ({
            productId: it.productId,
            partNumber: it.partNumber,
            description: it.description,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            discountPct: it.discountPct ? Number(it.discountPct) : 0,
            lineTotal: Number(it.lineTotal),
          }));
        }
      }

      let allBatches = Array.from(batchesMap.values());

      // Filter by search
      if (search) {
        allBatches = allBatches.filter((b) =>
          b.batchNumber.toLowerCase().includes(search) ||
          b.jobTitle.toLowerCase().includes(search) ||
          b.customerName.toLowerCase().includes(search) ||
          b.customerNumber.toLowerCase().includes(search) ||
          b.orderNumber.toLowerCase().includes(search) ||
          b.preinstalls.some((p: any) =>
            p.preinstallNo.toLowerCase().includes(search) ||
            p.fleetNumber.toLowerCase().includes(search) ||
            p.regoNumber.toLowerCase().includes(search)
          )
        );
      }

      // Filter by status
      if (statusFilter) {
        allBatches = allBatches.filter((b) => b.status === statusFilter);
      }

      // Sort by creation date descending
      allBatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = allBatches.length;
      const paginated = allBatches.slice((page - 1) * pageSize, page * pageSize);

      return {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    } catch (err: any) {
      console.error('Failed to list bulk preinstalls:', err);
      return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
  }

  async findBulkById(id: string) {
    // 1. Look for preinstalls matching installJobId = id, OR id directly
    let preinstalls: any[] = await this.prisma.fMPreinstall.findMany({
      where: {
        deletedAt: null,
        OR: [
          { installJobId: id },
          { id: id },
          { notes: { contains: id } },
        ],
      },
      include: {
        customer: true,
        fmCustomer: true,
        installDetail: {
          include: {
            fMInstallDetailOrgIds: {
              include: { organizations: true },
            },
            User: true,
          },
        },
        items: {
          include: { product: true },
        },
        Depots: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!preinstalls || preinstalls.length === 0) {
      // Check installation job
      try {
        const job = await (this.prisma as any).installationJob.findUnique({
          where: { id },
          include: { customer: true },
        });
        if (job) {
          preinstalls = await this.prisma.fMPreinstall.findMany({
            where: { installJobId: job.id, deletedAt: null },
            include: {
              customer: true,
              fmCustomer: true,
              installDetail: { include: { User: true } },
              items: true,
              Depots: true,
            },
          });
        }
      } catch { }
    }

    if (!preinstalls || preinstalls.length === 0) {
      throw new BadRequestException(`Bulk preinstall record with ID '${id}' not found`);
    }

    const first = preinstalls[0];
    const customer = first.customer;
    const fmCustomer = first.fmCustomer;
    const installDetail = first.installDetail || ({} as any);

    const splitAddress = (val?: string | null) => {
      if (!val) return ['', '', '', ''];
      if (val.includes('||')) return val.split('||');
      if (val.includes('|')) return val.split('|');
      return [val, '', '', ''];
    };

    const [sAddr2, sCity, sState, sPostcode] = splitAddress(first.shippingAddress2);
    const [bAddr2, bCity, bState, bPostcode] = splitAddress(first.billingAddress2);

    let jobTitle = 'Airco Fleet Device Rollout';
    const match = first.notes?.match(/\[BULK JOB:\s*([^\]]+)\]/);
    if (match && match[1]) {
      jobTitle = match[1].trim();
    }

    const templateInstallDetail = {
      installType: installDetail.installType || first.type || 'NEW_INSTALL',
      fmUnitType: installDetail.fmUnitType || '',
      fmUnitCode: installDetail.fmUnitCode || '',
      modem4G: installDetail.modem4G ?? true,
      serviceCode: installDetail.serviceCode || '',
      mixCode: installDetail.mixCode || '',
      mixOrgId: installDetail.mixOrgId || '',
      mixSim1: installDetail.mixSim1 ?? false,
      sim1Type: installDetail.sim1Type,
      unitSim: installDetail.unitSim || '',
      unitSerial: installDetail.unitSerial || '',
      unitIMEI: installDetail.unitIMEI || '',
      visionType: installDetail.visionType,
      cameraType: installDetail.cameraType,
      cameraCount: installDetail.cameraCount ?? 2,
      mixSim2: installDetail.mixSim2 ?? false,
      sim2Type: installDetail.sim2Type,
      visSim: installDetail.visSim || '',
      visIMEI: installDetail.visIMEI || '',
      vis1Serial: installDetail.vis1Serial || '',
      vis2Serial: installDetail.vis2Serial || '',
      vis3Serial: installDetail.vis3Serial || '',
      vis4Serial: installDetail.vis4Serial || '',
      aiOption: installDetail.aiOption ?? false,
      tmaOption: installDetail.tmaOption ?? false,
      rimOption: installDetail.rimOption ?? false,
      nrc: installDetail.nrc ?? false,
      wiFi: installDetail.wiFi ?? false,
      safeGuard: installDetail.safeGuard ?? false,
      intSim: installDetail.intSim ?? false,
      organizations: (installDetail.fMInstallDetailOrgIds || []).map((o: any) => o.organizations).filter(Boolean),
    };

    const packageItems = (first.items || []).map((it: any) => ({
      productId: it.productId,
      partNumber: it.partNumber || it.product?.productCode || '',
      description: it.description || it.product?.name || '',
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      discountPct: Number(it.discountPct || 0),
      lineTotal: Number(it.lineTotal || (Number(it.quantity || 1) * Number(it.unitPrice || 0))),
    }));

    const vehicles = preinstalls.map((p: any, idx: number) => {
      const d = p.installDetail || {};
      return {
        id: p.id,
        preinstallId: p.id,
        preinstallNo: p.preinstallNo,
        status: p.status,
        fleetNumber: d.fleetNumber || `FL-${101 + idx}`,
        regoNumber: d.regoNumber || `REG-${101 + idx}`,
        vinNumber: d.vinNumber || `VIN-${1000 + idx}`,
        vehicleMake: d.vehicleMake || 'Isuzu',
        vehicleModel: d.vehicleModel || 'FTR',
        yearVariant: d.yearVariant || '2024',
        assetNumber: d.assetNumber || d.fleetNumber || '',
        unitSerial: d.unitSerial || '',
        unitIMEI: d.unitIMEI || '',
        notes: p.notes?.replace(/\[BULK JOB:[^\]]*\]\s*/, '') || '',
        createdAt: p.createdAt,
      };
    });

    const masterJobId = first.installJobId || id;
    const masterJobNumber = masterJobId.startsWith('INSTALL-BULK')
      ? `JOB-BULK-${masterJobId.replace('INSTALL-BULK-', '')}-${vehicles.length}V`
      : `JOB-${masterJobId}`;

    return {
      id: masterJobId,
      masterJobId,
      masterJobNumber,
      jobTitle,
      customerId: first.customerId,
      customer: {
        id: customer?.id,
        name: customer?.name,
        customerNumber: customer?.customerNumber,
        registeredName: customer?.registeredName,
      },
      fmCustomerId: first.fmCustomerId,
      fmCustomer: {
        id: fmCustomer?.id,
        fleetName: fmCustomer?.fleetName || customer?.name,
        fmWebNumber: fmCustomer?.fmWebNumber,
      },
      type: first.type,
      status: first.status,
      orderNumber: first.orderNumber || '',
      assignedUserId: first.assignedUserId || '',
      installerId: installDetail.installer || '',
      installerName: installDetail.User ? `${installDetail.User.firstName} ${installDetail.User.lastName}` : '',
      installDate: installDetail.installDate ? new Date(installDetail.installDate).toISOString().split('T')[0] : '',
      installLocation: installDetail.installLocation || first.shippingAddress1 || 'Customer Fleet Yard',
      depotId: first.depotId || '',
      notes: first.notes?.replace(/\[BULK JOB:[^\]]*\]\s*/, '') || '',
      shippingAddress: {
        name: first.shippingName || customer?.name || '',
        address1: first.shippingAddress1 || '',
        address2: sAddr2 || '',
        city: sCity || '',
        state: sState || '',
        postcode: sPostcode || first.shippingAddress3 || '',
      },
      billingAddress: {
        name: first.billingName || customer?.name || '',
        address1: first.billingAddress1 || '',
        address2: bAddr2 || '',
        city: bCity || '',
        state: bState || '',
        postcode: bPostcode || first.billingAddress3 || '',
      },
      defaultInstallDetail: templateInstallDetail,
      items: packageItems,
      vehicles,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    };
  }

  async updateBulk(id: string, dto: any, userId: string) {
    const { template, vehicles } = dto;
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      throw new BadRequestException('At least one vehicle is required.');
    }

    // 1. Locate all preinstalls for this bulk batch
    const existingPreinstalls = await this.prisma.fMPreinstall.findMany({
      where: {
        deletedAt: null,
        OR: [
          { installJobId: id },
          { id: id },
          { notes: { contains: id } },
        ],
      },
      include: {
        installDetail: true,
        items: true,
      },
    });

    const masterJobId = existingPreinstalls[0]?.installJobId || id;
    const ship = template?.shippingAddress || {};
    const bill = template?.billingAddress || {};

    const shipAddr2 = `${ship.address2 || ''}||${ship.city || ''}||${ship.state || ''}||${ship.postcode || ''}`;
    const billAddr2 = `${bill.address2 || ''}||${bill.city || ''}||${bill.state || ''}||${bill.postcode || ''}`;
    const installDate = template?.installDate ? new Date(template.installDate) : null;
    const installerId = template?.installer || template?.installerId || null;
    const installLocation = template?.installLocation || ship.address1 || 'Customer Fleet Yard';

    const defaultDetail = template?.defaultInstallDetail || {};

    // 2. Process each vehicle
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const isExisting = v.id && !v.id.startsWith('v-') && !v.id.startsWith('v_');

      if (isExisting) {
        // Update preinstall
        await this.prisma.fMPreinstall.update({
          where: { id: v.id },
          data: {
            customerId: template?.customerId || undefined,
            fmCustomerId: template?.fmCustomerId || undefined,
            type: template?.type || undefined,
            status: template?.status || undefined,
            orderNumber: v.orderNumber || template?.orderNumber || null,
            depotId: template?.depotId || null,
            assignedUserId: template?.assignedUserId || userId,
            shippingName: ship.name || template?.shippingName || null,
            shippingAddress1: ship.address1 || template?.shippingAddress1 || null,
            shippingAddress2: shipAddr2,
            shippingAddress3: ship.postcode || template?.shippingAddress3 || null,
            billingName: bill.name || template?.billingName || null,
            billingAddress1: bill.address1 || template?.billingAddress1 || null,
            billingAddress2: billAddr2,
            billingAddress3: bill.postcode || template?.billingAddress3 || null,
            notes: v.notes
              ? `[BULK JOB: ${template?.jobTitle || 'Rollout'}] ${v.notes}`
              : (template?.notes ? `[BULK JOB: ${template.jobTitle || 'Rollout'}] ${template.notes}` : `[BULK JOB: ${template?.jobTitle || 'Rollout'}]`),
          },
        }).catch((e) => console.warn('Could not update preinstall row:', e));

        // Update install detail
        await this.prisma.fMInstallDetail.upsert({
          where: { preinstallId: v.id },
          create: {
            preinstallId: v.id,
            installType: defaultDetail.installType || template?.type || 'NEW_INSTALL',
            fmUnitType: defaultDetail.fmUnitType || null,
            fmUnitCode: defaultDetail.fmUnitCode || null,
            modem4G: defaultDetail.modem4G ?? null,
            serviceCode: defaultDetail.serviceCode || null,
            mixCode: defaultDetail.mixCode || null,
            mixOrgId: defaultDetail.mixOrgId || null,
            mixSim1: defaultDetail.mixSim1 ?? null,
            sim1Type: defaultDetail.sim1Type ?? null,
            unitSim: v.unitSim || defaultDetail.unitSim || null,
            unitSerial: v.unitSerial || defaultDetail.unitSerial || null,
            unitIMEI: v.unitIMEI || defaultDetail.unitIMEI || null,
            visionType: defaultDetail.visionType || null,
            cameraType: defaultDetail.cameraType || null,
            cameraCount: defaultDetail.cameraCount ? Number(defaultDetail.cameraCount) : null,
            mixSim2: defaultDetail.mixSim2 ?? null,
            sim2Type: defaultDetail.sim2Type ?? null,
            visSim: v.visSim || defaultDetail.visSim || null,
            visIMEI: v.visIMEI || defaultDetail.visIMEI || null,
            aiOption: defaultDetail.aiOption ?? null,
            tmaOption: defaultDetail.tmaOption ?? null,
            rimOption: defaultDetail.rimOption ?? null,
            fleetNumber: v.fleetNumber || null,
            regoNumber: v.regoNumber || null,
            vinNumber: v.vinNumber || null,
            vehicleMake: v.vehicleMake || null,
            vehicleModel: v.vehicleModel || null,
            yearVariant: v.yearVariant || null,
            assetNumber: v.assetNumber != null ? String(v.assetNumber) : null,
            installer: v.installer || installerId,
            installLocation: v.installLocation || installLocation,
            installDate: installDate,
          },
          update: {
            installType: defaultDetail.installType || template?.type || undefined,
            fmUnitType: defaultDetail.fmUnitType,
            fmUnitCode: defaultDetail.fmUnitCode,
            modem4G: defaultDetail.modem4G,
            serviceCode: defaultDetail.serviceCode,
            mixCode: defaultDetail.mixCode,
            mixOrgId: defaultDetail.mixOrgId,
            mixSim1: defaultDetail.mixSim1,
            sim1Type: defaultDetail.sim1Type,
            unitSim: v.unitSim || defaultDetail.unitSim,
            unitSerial: v.unitSerial || defaultDetail.unitSerial,
            unitIMEI: v.unitIMEI || defaultDetail.unitIMEI,
            visionType: defaultDetail.visionType,
            cameraType: defaultDetail.cameraType,
            cameraCount: defaultDetail.cameraCount ? Number(defaultDetail.cameraCount) : null,
            mixSim2: defaultDetail.mixSim2,
            sim2Type: defaultDetail.sim2Type,
            visSim: v.visSim || defaultDetail.visSim,
            visIMEI: v.visIMEI || defaultDetail.visIMEI,
            aiOption: defaultDetail.aiOption,
            tmaOption: defaultDetail.tmaOption,
            rimOption: defaultDetail.rimOption,
            fleetNumber: v.fleetNumber,
            regoNumber: v.regoNumber,
            vinNumber: v.vinNumber,
            vehicleMake: v.vehicleMake,
            vehicleModel: v.vehicleModel,
            yearVariant: v.yearVariant,
            assetNumber: v.assetNumber != null ? String(v.assetNumber) : null,
            installer: v.installer || installerId,
            installLocation: v.installLocation || installLocation,
            installDate: installDate,
          },
        }).catch((e) => console.warn('Could not upsert install detail:', e));

        // Update items
        if (template?.items && Array.isArray(template.items)) {
          await this.prisma.fMPreinstallItem.deleteMany({
            where: { preinstallId: v.id },
          }).catch(() => { });

          const validItems = template.items.filter((it: any) => it.productId);
          if (validItems.length > 0) {
            await this.prisma.fMPreinstallItem.createMany({
              data: validItems.map((it: any) => ({
                preinstallId: v.id,
                productId: it.productId,
                partNumber: it.partNumber || '',
                description: it.description || '',
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.unitPrice || 0),
                discountPct: it.discountPct ? Number(it.discountPct) : null,
                lineTotal: Number(it.lineTotal || (Number(it.quantity || 1) * Number(it.unitPrice || 0))),
              })),
            }).catch(() => { });
          }
        }
      } else {
        // Newly added vehicle row during edit!
        const preinstallNo = await this.generateNumber();
        const newP = await this.prisma.fMPreinstall.create({
          data: {
            preinstallNo,
            type: template?.type || 'NEW_INSTALL',
            status: template?.status || 'NOT_ACTIONED',
            createdBy: userId,
            assignedUserId: template?.assignedUserId || userId,
            orderNumber: v.orderNumber || template?.orderNumber || null,
            depotId: template?.depotId || null,
            shippingName: ship.name || template?.shippingName || null,
            shippingAddress1: ship.address1 || template?.shippingAddress1 || null,
            shippingAddress2: shipAddr2,
            shippingAddress3: ship.postcode || template?.shippingAddress3 || null,
            billingName: bill.name || template?.billingName || null,
            billingAddress1: bill.address1 || template?.billingAddress1 || null,
            billingAddress2: billAddr2,
            billingAddress3: bill.postcode || template?.billingAddress3 || null,
            notes: v.notes ? `[BULK JOB: ${template?.jobTitle || 'Rollout'}] ${v.notes}` : `[BULK JOB: ${template?.jobTitle || 'Rollout'}]`,
            customerId: template?.customerId,
            fmCustomerId: template?.fmCustomerId || null,
            installJobId: masterJobId,
          },
        });

        await this.prisma.fMInstallDetail.create({
          data: {
            preinstallId: newP.id,
            installType: defaultDetail.installType || template?.type || 'NEW_INSTALL',
            fmUnitType: defaultDetail.fmUnitType || null,
            fmUnitCode: defaultDetail.fmUnitCode || null,
            modem4G: defaultDetail.modem4G ?? null,
            serviceCode: defaultDetail.serviceCode || null,
            mixCode: defaultDetail.mixCode || null,
            mixOrgId: defaultDetail.mixOrgId || null,
            mixSim1: defaultDetail.mixSim1 ?? null,
            sim1Type: defaultDetail.sim1Type ?? null,
            unitSim: v.unitSim || defaultDetail.unitSim || null,
            unitSerial: v.unitSerial || defaultDetail.unitSerial || null,
            unitIMEI: v.unitIMEI || defaultDetail.unitIMEI || null,
            visionType: defaultDetail.visionType || null,
            cameraType: defaultDetail.cameraType || null,
            cameraCount: defaultDetail.cameraCount ? Number(defaultDetail.cameraCount) : null,
            mixSim2: defaultDetail.mixSim2 ?? null,
            sim2Type: defaultDetail.sim2Type ?? null,
            visSim: v.visSim || defaultDetail.visSim || null,
            visIMEI: v.visIMEI || defaultDetail.visIMEI || null,
            aiOption: defaultDetail.aiOption ?? null,
            tmaOption: defaultDetail.tmaOption ?? null,
            rimOption: defaultDetail.rimOption ?? null,
            fleetNumber: v.fleetNumber || null,
            regoNumber: v.regoNumber || null,
            vinNumber: v.vinNumber || null,
            vehicleMake: v.vehicleMake || null,
            vehicleModel: v.vehicleModel || null,
            yearVariant: v.yearVariant || null,
            assetNumber: v.assetNumber != null ? String(v.assetNumber) : null,
            installer: v.installer || installerId,
            installLocation: v.installLocation || installLocation,
            installDate: installDate,
          },
        }).catch(() => { });

        if (template?.items && Array.isArray(template.items)) {
          const validItems = template.items.filter((it: any) => it.productId);
          if (validItems.length > 0) {
            await this.prisma.fMPreinstallItem.createMany({
              data: validItems.map((it: any) => ({
                preinstallId: newP.id,
                productId: it.productId,
                partNumber: it.partNumber || '',
                description: it.description || '',
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.unitPrice || 0),
                discountPct: it.discountPct ? Number(it.discountPct) : null,
                lineTotal: Number(it.lineTotal || (Number(it.quantity || 1) * Number(it.unitPrice || 0))),
              })),
            }).catch(() => { });
          }
        }
      }
    }

    // 3. Update master installation job if it exists
    try {
      await (this.prisma as any).installationJob.update({
        where: { id: masterJobId },
        data: {
          status: template?.status || undefined,
          location: installLocation,
          technicianId: installerId,
          installationDate: installDate && !isNaN(installDate.getTime()) ? installDate : null,
          notes: `Bulk Rollout: ${vehicles.length} vehicles. Order: ${template?.orderNumber || 'N/A'}. ${template?.notes || ''}`,
        },
      });
    } catch { }

    return {
      success: true,
      message: 'Bulk preinstallation updated successfully',
      id: masterJobId,
      count: vehicles.length,
    };
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
          installDetail: {
            include: {
              User: true
            }
          },
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

    const numOr = (v: unknown, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

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
        ...(dto.orderNumber !== undefined && { orderNumber: dto.orderNumber?.trim() || null }),
        ...(dto.assignedUserId !== undefined && {
          assignedUserId: dto.assignedUserId || null,
        }),

        ...(dto.customerId && {
          customer: { connect: { id: dto.customerId } },
        }),

        ...(dto.fmCustomerId && {
          fmCustomer: { connect: { id: dto.fmCustomerId } },
        }),

        ...(dto.depotId !== undefined && {
          Depots: dto.depotId
            ? { connect: { id: dto.depotId } }
            : { disconnect: true },
        }),

        ...(dto.dispatchMethod !== undefined && {
          dispatchMethod: dto.dispatchMethod || null,
        }),
        ...(dto.dispatchRef !== undefined && {
          dispatchRef: dto.dispatchRef || null,
        }),

        ...(dto.chargeParts !== undefined && { chargeParts: numOr(dto.chargeParts) }),
        ...(dto.chargeSundries !== undefined && { chargeSundries: numOr(dto.chargeSundries) }),
        ...(dto.chargeLabour !== undefined && { chargeLabour: numOr(dto.chargeLabour) }),
        ...(dto.chargeFreight !== undefined && { chargeFreight: numOr(dto.chargeFreight) }),
        ...(dto.chargeGst !== undefined && { chargeGst: numOr(dto.chargeGst) }),
        ...(dto.chargeRounding !== undefined && { chargeRounding: numOr(dto.chargeRounding) }),
        ...(dto.chargeTotal !== undefined && { chargeTotal: numOr(dto.chargeTotal) }),
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
    const validItems = (items ?? []).filter(i => i.productId && i.productId !== '');
    const keepIds = validItems.map(i => i.id).filter(Boolean) as string[];

    await this.prisma.$transaction(async tx => {
      // Soft-delete lines removed in the UI
      await tx.fMPreinstallItem.updateMany({
        where: {
          preinstallId: id,
          deletedAt: null,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
        },
        data: { deletedAt: new Date() },
      });

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
              deletedAt: null,
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

    return this.findById(id);
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
    const { type, dependsOn } = query || {};

    try {
      return await this.prisma.fMServiceSegment.findMany({
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
    } catch (err: any) {
      console.warn(`[FMPreinstallService] Database query for FMServiceSegment failed; using fallback records: ${err?.message}`);
      throw new Error('fM Service Segment not found')
    }
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
    const targetList = updatedBoard?.lists.find(
      (l: any) => l.name === 'Admin To Do',
    ) ?? updatedBoard?.lists[0];

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