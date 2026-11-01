import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ListAssignedParams = {
  userId: string;
  skip?: number;
  take?: number;
  status?: string;
  search?: string;
};

const statusMappingToFrontend: Record<string, string> = {
  NOT_ACTIONED: 'Not Actioned',
  WORKSHOP_SETUP: 'Workshop Setup',
  WAITING_INSTALL: 'Waiting Install',
  INSTALLED: 'Installed',
  INVOICED: 'Invoiced',
  COMPLETED: 'Completed',
};

const hardwareModelToFrontend: Record<string, string> = {
  MIX4000: 'MIX4000',
  FM3306: 'FM3306',
  HD_CAMERA: 'HD Camera',
  STANDARD_CAMERA: 'Standard Camera',
  BASE_UNIT: 'Base Unit',
  SIM: 'SIM',
  GPS_UNIT: 'GPS Unit',
  CAN_BUS_INTERFACE: 'CAN Bus Interface',
  DRIVER_ID_KEYPAD: 'Driver ID Keypad',
};

const hardwareCategoryToFrontend: Record<string, string> = {
  TELEMATICS_UNIT: 'Telematics Unit',
  CAMERA_AND_VIDEO: 'Camera & Video',
  CONNECTIVITY: 'Connectivity',
  SENSORS: 'Sensors',
  CORE_UNIT: 'Core Unit',
  ACCESSORIES: 'Accessories',
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private prisma: PrismaService) { }

  private userDisplayName(user?: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null) {
    if (!user) return undefined;
    const display = String(user.displayName ?? '').trim();
    if (display) return display;
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (full) return full;
    return user.email || undefined;
  }

  private toFrontendHardwareModel(model?: string | null): string | undefined {
    if (!model) return undefined;
    return hardwareModelToFrontend[model] || model;
  }

  private toFrontendHardwareCategory(category?: string | null): string | undefined {
    if (!category) return undefined;
    return hardwareCategoryToFrontend[category] || category;
  }

  private parsePhotos(raw: unknown): Array<{
    id: string;
    url: string;
    blobName?: string;
    fileName?: string;
    createdAt: string;
  }> {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (p) => p && typeof p === 'object' && typeof (p as any).id === 'string' && typeof (p as any).url === 'string',
    ) as any;
  }

  private parseComments(
    raw: unknown,
    legacyNotes?: string | null,
  ): Array<{ id: string; text: string; authorName?: string; createdAt: string }> {
    const fromJson = Array.isArray(raw)
      ? raw.filter(
        (c) =>
          c &&
          typeof c === 'object' &&
          typeof (c as any).id === 'string' &&
          typeof (c as any).text === 'string' &&
          String((c as any).text).trim(),
      )
      : [];

    if (fromJson.length) return fromJson as any;

    const note = String(legacyNotes ?? '').trim();
    if (!note) return [];
    return [
      {
        id: 'legacy-note',
        text: note,
        authorName: 'Installer',
        createdAt: new Date(0).toISOString(),
      },
    ];
  }

  private async technicianNameMap(jobs: any[]) {
    const missing = Array.from(
      new Set(
        jobs
          .filter((j) => j.technicianId && !this.userDisplayName(j.user))
          .map((j) => j.technicianId as string),
      ),
    );
    if (!missing.length) return new Map<string, string>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: missing } },
      select: { id: true, displayName: true, firstName: true, lastName: true, email: true },
    });
    const map = new Map<string, string>();
    for (const u of users) {
      const name = this.userDisplayName(u);
      if (name) map.set(u.id, name);
    }
    return map;
  }

  private mapJobToFrontend(j: any, nameById?: Map<string, string>) {
    const techId = j.technicianId || j.userId || undefined;
    const technicianName =
      this.userDisplayName(j.user) ||
      (techId ? nameById?.get(techId) : undefined) ||
      undefined;

    return {
      id: j.id,
      jobNumber: j.jobNumber,
      assignedTo: j.assignedTo,
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
        model: this.toFrontendHardwareModel(h.model) || h.model,
        name: h.name,
        serialNumber: h.serialNumber,
        imei: h.imei,
        category: this.toFrontendHardwareCategory(h.category) || h.category,
      })),
      lineItems: (j.lineItems || []).map((li: any) => ({
        id: li.id,
        productId: li.productId,
        partNo: li.partNo || li.product?.productCode || '',
        description: li.description,
        quantity: Number(li.quantity ?? 1),
        unitPrice: Number(li.unitPrice ?? 0),
        discountPct: Number(li.discountPct ?? 0),
        landedCost: Number(li.landedCost ?? li.product?.landedCost ?? 0),
        lineTotal: Number(li.lineTotal ?? 0),
        availableQty: li.product?.onHand != null ? Number(li.product.onHand) : null,
      })),
      technicianId: techId,
      technicianName,
      installationDate: j.installationDate ? new Date(j.installationDate).toISOString().split('T')[0] : undefined,
      startTime: j.startTime || undefined,
      endTime: j.endTime || undefined,
      isScheduled: j.isScheduled,
      status: statusMappingToFrontend[j.status] || j.status,
      checklistSections: (j.checklistSections || []).map((sec: any) => ({
        id: sec.id,
        title: sec.title,
        hardwareModel: this.toFrontendHardwareModel(sec.hardwareModel) || sec.hardwareModel,
        hardwareName: sec.hardwareName,
        items: (sec.items || []).map((it: any) => ({
          id: it.id,
          title: it.title,
          description: it.description,
          section: sec.title,
          hardwareModel: this.toFrontendHardwareModel(it.hardwareModel) || it.hardwareModel,
          isRequired: it.isRequired,
          displayOrder: it.displayOrder,
          completed: it.completed,
          completedBy: it.completedByName || it.completedBy,
          completedAt: it.completedAt ? new Date(it.completedAt).toISOString() : undefined,
          notes: it.notes,
          comments: this.parseComments(it.comments, it.notes),
          // Private Azure containers block anonymous blob URLs — serve via authenticated API proxy
          photos: this.parsePhotos(it.photos).map((p) => ({
            id: p.id,
            fileName: p.fileName,
            createdAt: p.createdAt,
            blobName: p.blobName,
            url: `/installations/${j.id}/checklist/${sec.id}/items/${it.id}/photos/${p.id}/file`,
          })),
        })),
      })),
      timeline: (j.timeline || []).map((t: any) => {
        let note = t.note as string | undefined;
        // Rewrite legacy timeline notes that embedded the raw technician id
        if (note && techId && technicianName && note.includes(techId)) {
          note = note.split(techId).join(technicianName);
        }
        return {
          id: t.id,
          status: statusMappingToFrontend[t.status] || t.status,
          timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString(),
          updatedBy: t.updatedByName || 'Operations Dispatch',
          note,
        };
      }),
      notes: j.notes,
      createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      canInvoice: j.canInvoice,
      invoiceId: j.invoiceId,
    };
  }

  async findAssigned(params: ListAssignedParams) {
    const { userId, skip = 0, take = 20, status, search } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // List view does not need line items — including them breaks the whole
    // list if InstallationJobItem migration has not been applied yet.
    const baseListInclude = {
      customer: true,
      vehicle: true,
      user: true,
      hardware: true,
      timeline: {
        orderBy: { timestamp: 'desc' },
      },
    };

    const itemSelectFull = {
      id: true,
      sectionId: true,
      templateItemId: true,
      title: true,
      description: true,
      section: true,
      hardwareModel: true,
      isRequired: true,
      displayOrder: true,
      completed: true,
      completedById: true,
      completedByName: true,
      completedAt: true,
      notes: true,
      photos: true,
      comments: true,
      createdAt: true,
      updatedAt: true,
    };

    const itemSelectNoComments = { ...itemSelectFull, comments: undefined };
    delete (itemSelectNoComments as any).comments;
    const itemSelectMinimal = { ...itemSelectNoComments, photos: undefined };
    delete (itemSelectMinimal as any).photos;

    const withItemSelect = (itemSelect: Record<string, boolean>) => ({
      ...baseListInclude,
      checklistSections: {
        orderBy: { id: 'asc' },
        include: {
          items: {
            select: itemSelect,
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    });

    const attempts = [
      withItemSelect(itemSelectFull),
      withItemSelect(itemSelectNoComments),
      withItemSelect(itemSelectMinimal),
      {
        ...baseListInclude,
        checklistSections: { orderBy: { id: 'asc' } },
      },
      baseListInclude,
    ];

    let lastError: any;
    for (const include of attempts) {
      try {
        const jobs = await (this.prisma as any ).installationJob.findMany({
          where: {
            technicianId: userId,
            ...where
          },
          include,
          orderBy: { createdAt: 'desc' },
        });
        const nameById = await this.technicianNameMap(jobs);
        const mapped = jobs.map((j: any) => this.mapJobToFrontend(j, nameById));
        return { data: mapped, total: mapped.length };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`listJobs include attempt failed: ${err?.message}`);
      }
    }

    this.logger.error(`listJobs exhausted fallbacks: ${lastError?.message}`);
    // Surface failure instead of silently emptying the Job Book
    throw new BadRequestException(
      lastError?.message ||
      'Failed to load installation jobs. Apply pending Prisma migrations (comments/photos columns).',
    );
  }
}
