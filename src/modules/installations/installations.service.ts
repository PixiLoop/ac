import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const statusMappingToFrontend: Record<string, string> = {
  NOT_ACTIONED: 'Not Actioned',
  WORKSHOP_SETUP: 'Workshop Setup',
  WAITING_INSTALL: 'Waiting Install',
  INSTALLED: 'Installed',
  INVOICED: 'Invoiced',
  COMPLETED: 'Completed',
};

const statusMappingToDb: Record<string, any> = {
  'Not Actioned': 'NOT_ACTIONED',
  'Workshop Setup': 'WORKSHOP_SETUP',
  'Waiting Install': 'WAITING_INSTALL',
  Installed: 'INSTALLED',
  Invoiced: 'INVOICED',
  Completed: 'COMPLETED',
};

@Injectable()
export class InstallationsService {
  private readonly logger = new Logger(InstallationsService.name);

  constructor(private prisma: PrismaService) {}

  async listJobs(query: Record<string, any> = {}) {
    const { status, technicianId, search } = query;

    const where: any = {};
    if (status && status !== 'All') {
      const dbStatus = statusMappingToDb[status] || status;
      where.status = dbStatus;
    }
    if (technicianId && technicianId !== 'All') {
      where.technicianId = technicianId;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const jobs = await (this.prisma as any).installationJob.findMany({
        where,
        include: {
          customer: true,
          vehicle: true,
          user: true,
          hardware: true,
          checklistSections: {
            include: {
              items: {
                orderBy: { displayOrder: 'asc' },
              },
            },
            orderBy: { id: 'asc' },
          },
          timeline: {
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = jobs.map((j: any) => this.mapJobToFrontend(j));
      return { data: mapped, total: mapped.length };
    } catch (err: any) {
      this.logger.warn(`listJobs error: ${err?.message}`);
      return { data: [], total: 0 };
    }
  }

  async getJob(id: string) {
    const job = await (this.prisma as any).installationJob.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        user: true,
        hardware: true,
        checklistSections: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Installation job with ID ${id} not found`);
    }

    return this.mapJobToFrontend(job);
  }

  async createJob(dto: any) {
    const customerId = dto.customerId;
    let vehicleId = dto.vehicleId;

    if (!vehicleId && dto.vehicle) {
      const rego = dto.vehicle.rego || 'TBD';
      const vin = dto.vehicle.vin || `VIN-${Date.now()}`;
      let vehicle = await (this.prisma as any).vehicle.findFirst({
        where: { OR: [{ vin }, { rego, customerId }] },
      });
      if (!vehicle) {
        vehicle = await (this.prisma as any).vehicle.create({
          data: {
            customerId,
            rego,
            vin,
            fleetNumber: dto.vehicle.fleetNumber || 'FLEET-01',
            makeModel: dto.vehicle.makeModel || 'Commercial Vehicle',
          },
        });
      }
      vehicleId = vehicle.id;
    }

    const id = dto.id || `INSTALL-${Date.now().toString().slice(-4)}`;
    const jobNumber = dto.jobNumber || `JOB-2026-${Date.now().toString().slice(-4)}`;
    const dbStatus = statusMappingToDb[dto.status] || 'NOT_ACTIONED';

    const job = await (this.prisma as any).installationJob.create({
      data: {
        id,
        jobNumber,
        customerId,
        projectId: dto.projectId || 'proj-fleet-telematics',
        vehicleId,
        location: dto.location || 'Main Workshop',
        technicianId: dto.technicianId || null,
        installationDate: dto.installationDate ? new Date(dto.installationDate) : null,
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        isScheduled: !!dto.isScheduled,
        status: dbStatus,
        notes: dto.notes || '',
        timeline: {
          create: {
            status: dbStatus,
            updatedByName: 'Operations Dispatch',
            note: 'Job created',
          },
        },
      },
      include: {
        customer: true,
        vehicle: true,
        user: true,
        hardware: true,
        checklistSections: {
          include: { items: true },
        },
        timeline: true,
      },
    });

    return this.mapJobToFrontend(job);
  }

  async scheduleJob(
    id: string,
    payload: { technicianId: string; date: string; startTime: string; endTime: string; notes?: string }
  ) {
    const job = await (this.prisma as any).installationJob.update({
      where: { id },
      data: {
        technicianId: payload.technicianId,
        installationDate: new Date(payload.date),
        startTime: payload.startTime,
        endTime: payload.endTime,
        isScheduled: true,
        notes: payload.notes !== undefined ? payload.notes : undefined,
        timeline: {
          create: {
            status: 'WAITING_INSTALL',
            updatedByName: 'Scheduler',
            note: `Scheduled with technician ${payload.technicianId} for ${payload.date} (${payload.startTime} - ${payload.endTime})`,
          },
        },
      },
      include: {
        customer: true,
        vehicle: true,
        user: true,
        hardware: true,
        checklistSections: {
          include: { items: true },
        },
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    return this.mapJobToFrontend(job);
  }

  async updateStatus(
    id: string,
    payload: { newStatus: string; note?: string; updatedBy?: string; bypassValidation?: boolean }
  ) {
    const dbStatus = statusMappingToDb[payload.newStatus] || payload.newStatus;

    const job = await (this.prisma as any).installationJob.update({
      where: { id },
      data: {
        status: dbStatus,
        canInvoice: dbStatus === 'COMPLETED' || dbStatus === 'INSTALLED',
        timeline: {
          create: {
            status: dbStatus,
            updatedByName: payload.updatedBy || 'Operations Dispatch',
            note: payload.note || `Status transitioned to ${payload.newStatus}`,
          },
        },
      },
      include: {
        customer: true,
        vehicle: true,
        user: true,
        hardware: true,
        checklistSections: {
          include: { items: true },
        },
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    return this.mapJobToFrontend(job);
  }

  async addHardware(id: string, hardware: any) {
    const hw = await (this.prisma as any).hardwareItem.create({
      data: {
        model: hardware.model || 'MIX4000',
        name: hardware.name || 'Hardware Unit',
        category: hardware.category || 'Telematics Unit',
        serialNumber: hardware.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
        imei: hardware.imei || null,
        allocatedJobId: id,
      },
    });

    return this.getJob(id);
  }

  async removeHardware(id: string, hardwareId: string) {
    await (this.prisma as any).hardwareItem.deleteMany({
      where: { id: hardwareId, allocatedJobId: id },
    });

    return this.getJob(id);
  }

  async updateChecklistItem(
    id: string,
    sectionId: string,
    itemId: string,
    payload: { completed?: boolean; notes?: string; completedBy?: string }
  ) {
    await (this.prisma as any).jobChecklistItem.updateMany({
      where: { id: itemId },
      data: {
        completed: payload.completed !== undefined ? payload.completed : undefined,
        notes: payload.notes !== undefined ? payload.notes : undefined,
        completedBy: payload.completedBy || undefined,
        completedAt: payload.completed ? new Date() : null,
      },
    });

    const job = await this.getJob(id);
    return { item: { id: itemId, ...payload }, job };
  }

  private mapJobToFrontend(j: any) {
    return {
      id: j.id,
      jobNumber: j.jobNumber,
      customerId: j.customerId,
      customerName: j.customer?.name || 'Customer',
      customerContact: j.customer?.contactPerson || 'Fleet Operations',
      customerPhone: j.customer?.phone || '02 9876 5432',
      projectId: j.projectId || 'proj-sydney-fleet',
      projectName: 'Fleet Telematics Rollout',
      location: j.location,
      vehicle: {
        rego: j.vehicle?.rego || 'N/A',
        fleetNumber: j.vehicle?.fleetNumber || 'N/A',
        vin: j.vehicle?.vin || 'N/A',
        makeModel: j.vehicle?.makeModel || 'Commercial Vehicle',
      },
      hardware: (j.hardware || []).map((h: any) => ({
        id: h.id,
        model: h.model,
        name: h.name,
        serialNumber: h.serialNumber,
        imei: h.imei,
        category: h.category,
      })),
      technicianId: j.technicianId || undefined,
      technicianName: j.user ? `${j.user.firstName} ${j.user.lastName}` : (j.technicianId || undefined),
      installationDate: j.installationDate ? new Date(j.installationDate).toISOString().split('T')[0] : undefined,
      startTime: j.startTime || undefined,
      endTime: j.endTime || undefined,
      isScheduled: j.isScheduled,
      status: statusMappingToFrontend[j.status] || j.status,
      checklistSections: (j.checklistSections || []).map((sec: any) => ({
        id: sec.id,
        title: sec.title,
        hardwareModel: sec.hardwareModel,
        hardwareName: sec.hardwareName,
        items: (sec.items || []).map((it: any) => ({
          id: it.id,
          title: it.title,
          description: it.description,
          section: sec.title,
          hardwareModel: it.hardwareModel,
          isRequired: it.isRequired,
          displayOrder: it.displayOrder,
          completed: it.completed,
          completedBy: it.completedBy,
          completedAt: it.completedAt ? new Date(it.completedAt).toISOString() : undefined,
          notes: it.notes,
        })),
      })),
      timeline: (j.timeline || []).map((t: any) => ({
        id: t.id,
        status: statusMappingToFrontend[t.status] || t.status,
        timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString(),
        updatedBy: t.updatedByName || 'Operations Dispatch',
        note: t.note,
      })),
      notes: j.notes,
      createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      canInvoice: j.canInvoice,
      invoiceId: j.invoiceId,
    };
  }

  // Dispatches fallback
  async getAllDispatches(query: Record<string, any> = {}) {
    const { search, skip, take, sortKey, sortDir } = query;
    const where: any = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { dispatchNumber: { contains: search, mode: 'insensitive' } },
          { conNote: { contains: search, mode: 'insensitive' } },
          { shippingAddress: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    let orderBy: any = { dispatchDate: 'desc' };
    if (sortKey && sortDir) {
      orderBy = { [sortKey]: String(sortDir).toLowerCase() };
    }

    const skipNum = skip !== undefined ? parseInt(String(skip), 10) : undefined;
    const takeNum = take !== undefined ? parseInt(String(take), 10) : undefined;

    const [dispatches, total] = await Promise.all([
      this.prisma.dispatch.findMany({
        where,
        skip: skipNum,
        take: takeNum,
        orderBy,
        include: {
          DispatchedInvoices: {
            include: {
              Invoice: true,
              DispatchMethod: true,
              User: true,
            },
          },
        },
      }),
      this.prisma.dispatch.count({ where }),
    ]);

    const items = dispatches.map((item) => ({
      ...item,
      totalCost: item.DispatchedInvoices
        .map((di) => di.Invoice?.total ?? 0)
        .reduce<number>((acc, di) => acc + Number(di ?? 0), 0)
        .toFixed(2),
      DispatchedInvoices: item.DispatchedInvoices.map((di) => ({
        ...di,
        Invoice: {
          id: di.Invoice?.id,
          invoiceNumber: di.Invoice?.invoiceNumber,
        },
        User: undefined,
        salesPerson: di.User ? `${di.User.firstName} ${di.User.lastName}` : '—',
      })),
    }));

    return { items, total };
  }
}
