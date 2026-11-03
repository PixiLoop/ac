import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AzureStorageService } from '../../common/azure/azure-storage.service';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { InstallationJob } from '@prisma/client';

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

/** Frontend Job Book labels ↔ Prisma HardwareModel */
const hardwareModelToDb: Record<string, string> = {
  MIX4000: 'MIX4000',
  FM3306: 'FM3306',
  'HD Camera': 'HD_CAMERA',
  HD_CAMERA: 'HD_CAMERA',
  'Standard Camera': 'STANDARD_CAMERA',
  STANDARD_CAMERA: 'STANDARD_CAMERA',
  'Base Unit': 'BASE_UNIT',
  BASE_UNIT: 'BASE_UNIT',
  SIM: 'SIM',
  'GPS Unit': 'GPS_UNIT',
  GPS_UNIT: 'GPS_UNIT',
  'CAN Bus Interface': 'CAN_BUS_INTERFACE',
  CAN_BUS_INTERFACE: 'CAN_BUS_INTERFACE',
  'Driver ID Keypad': 'DRIVER_ID_KEYPAD',
  DRIVER_ID_KEYPAD: 'DRIVER_ID_KEYPAD',
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

const hardwareCategoryToDb: Record<string, string> = {
  'Telematics Unit': 'TELEMATICS_UNIT',
  TELEMATICS_UNIT: 'TELEMATICS_UNIT',
  'Camera & Video': 'CAMERA_AND_VIDEO',
  CAMERA_AND_VIDEO: 'CAMERA_AND_VIDEO',
  Connectivity: 'CONNECTIVITY',
  CONNECTIVITY: 'CONNECTIVITY',
  Sensors: 'SENSORS',
  SENSORS: 'SENSORS',
  'Core Unit': 'CORE_UNIT',
  CORE_UNIT: 'CORE_UNIT',
  Accessories: 'ACCESSORIES',
  ACCESSORIES: 'ACCESSORIES',
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
export class InstallationsService {
  private readonly logger = new Logger(InstallationsService.name);

  constructor(
    private prisma: PrismaService,
    private azure: AzureStorageService,
  ) { }

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

  private toDbHardwareModel(model?: string | null): string | null {
    if (!model) return null;
    return hardwareModelToDb[model] || hardwareModelToDb[String(model).replace(/\s+/g, '_').toUpperCase()] || null;
  }

  private toFrontendHardwareModel(model?: string | null): string | undefined {
    if (!model) return undefined;
    return hardwareModelToFrontend[model] || model;
  }

  private toDbHardwareCategory(category?: string | null): string {
    if (!category) return 'TELEMATICS_UNIT';
    return hardwareCategoryToDb[category] || 'TELEMATICS_UNIT';
  }

  private toFrontendHardwareCategory(category?: string | null): string | undefined {
    if (!category) return undefined;
    return hardwareCategoryToFrontend[category] || category;
  }

  /**
   * Attach ACTIVE checklist templates for the given hardware models onto a job.
   * Skips models that already have at least one checklist section on the job.
   * If no database template exists for the model, automatically provisions standard QA sections.
   */
  private async attachChecklistsForModels(jobId: string, models: string[]) {
    const rawCandidates = models.length > 0 ? models.map((m) => String(m || '').trim()).filter(Boolean) : ['MIX4000'];
    const candidates = Array.from(new Set(rawCandidates));

    for (const candidate of candidates) {
      const validEnums = [
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
      const dbModel = this.toDbHardwareModel(candidate) || (validEnums.includes(candidate.toUpperCase()) ? candidate.toUpperCase() : 'MIX4000');
      const label = this.toFrontendHardwareModel(dbModel) || candidate;

      const existingCount = await (this.prisma as any).jobChecklistSection.count({
        where: { jobId, hardwareModel: dbModel },
      });
      if (existingCount > 0) continue;

      let tmpl: any = null;
      try {
        // 1. Try finding segment and its associated ChecklistTemplate
        const segment = await (this.prisma as any).fMServiceSegment.findFirst({
          where: {
            isActive: true,
            OR: [
              { code: { equals: candidate, mode: 'insensitive' } },
              { label: { equals: candidate, mode: 'insensitive' } },
              { id: candidate },
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

        if (segment?.ChecklistTemplate?.length) {
          tmpl = { ...segment.ChecklistTemplate[0], FMServiceSegment: segment };
        }

        // 2. Direct template lookup by fmSegmentId, segment code/label, or name
        if (!tmpl) {
          tmpl = await (this.prisma as any).checklistTemplate.findFirst({
            where: {
              status: 'ACTIVE',
              OR: [
                ...(segment ? [{ fmSegmentId: segment.id }] : []),
                { FMServiceSegment: { code: { equals: candidate, mode: 'insensitive' } } },
                { FMServiceSegment: { label: { equals: candidate, mode: 'insensitive' } } },
                { name: { contains: candidate, mode: 'insensitive' } },
                { name: { contains: label, mode: 'insensitive' } },
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
        }

        // 3. If still not found, check any active template in the system before falling back to generic
        if (!tmpl) {
          tmpl = await (this.prisma as any).checklistTemplate.findFirst({
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
        }
      } catch (err: any) {
        this.logger.warn(`Template lookup error for ${candidate}: ${err?.message}`);
      }

      let sectionsToCreate = tmpl?.sections;
      const hardwareTitle = tmpl?.FMServiceSegment?.label || tmpl?.name || `${label} Telematics System`;

      // Fallback default QA sections only when no template is configured in DB
      if (!sectionsToCreate || sectionsToCreate.length === 0) {
        sectionsToCreate = [
          {
            title: 'Pre-Installation Inspection',
            items: [
              {
                title: 'Verify vehicle ignition OFF and isolate auxiliary battery',
                description: 'Essential safety check prior to vehicle wiring harness modification',
                isRequired: true,
              },
              {
                title: 'Inspect physical mounting clearance behind dashboard/trim',
                description: 'Ensure adequate airflow and zero obstruction with vehicle steering/pedal linkages',
                isRequired: true,
              },
              {
                title: 'Confirm unit serial number & SIM allocation match work order',
                description: 'Verify hardware matches digital dispatch records',
                isRequired: true,
              },
            ],
          },
          {
            title: 'Mounting & Wiring Harness',
            items: [
              {
                title: 'Securely mount unit bracket using automotive-grade ties/hardware',
                description: 'Unit must be vibration-resistant and firmly anchored to subframe',
                isRequired: true,
              },
              {
                title: 'Connect constant 12V/24V power, chassis ground, and ignition sense',
                description: 'Solder or crimp heat-shrink inline blade fuses according to specification',
                isRequired: true,
              },
              {
                title: 'Position GPS & cellular antenna with clear line-of-sight to sky',
                description: 'Mount on windshield or top dash; avoid metal overhangs',
                isRequired: true,
              },
            ],
          },
          {
            title: 'Function Testing & Evidence Sign-Off',
            items: [
              {
                title: 'Cycle vehicle ignition and verify status LED indicators',
                description: 'Confirm solid cellular registration and satellite fix lock',
                isRequired: true,
              },
              {
                title: 'Capture photographic evidence of installed hardware & fuse tap',
                description: 'Upload high-resolution photo for QA sign-off verification',
                isRequired: true,
              },
              {
                title: 'Tidy wiring loom with loom tape and reinstall all trim panels',
                description: 'Return vehicle cabin to OEM clean condition',
                isRequired: true,
              },
            ],
          },
        ];
      }

      let sectionOrder =
        (await (this.prisma as any).jobChecklistSection.count({ where: { jobId } })) + 1;

      for (const sec of sectionsToCreate) {
        try {
          await (this.prisma as any).jobChecklistSection.create({
            data: {
              jobId,
              title: `${tmpl?.name || label} — ${sec.title}`,
              hardwareModel: dbModel,
              hardwareName: hardwareTitle,
              displayOrder: sec.displayOrder || sectionOrder++,
              items: {
                create: (sec.items || []).map((item: any, idx: number) => ({
                  templateItemId: item.id || null,
                  title: item.title,
                  description: item.description || null,
                  section: sec.title,
                  hardwareModel: dbModel,
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
        } catch (createErr: any) {
          this.logger.warn(`Failed to create checklist section for job ${jobId}: ${createErr?.message}`);
        }
      }
    }
  }

  /** Resolve technician names when userId was never linked (legacy rows). */
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
        const preinstalls = await (this.prisma as any).fMPreinstall.findMany({
          where: { installJobId: { not: null } },
          select: { installJobId: true },
        }).catch(() => []);
        const preinstallJobIds = new Set<string>(
          preinstalls.map((p: any) => String(p.installJobId || '')).filter(Boolean),
        );

        const jobs = await (this.prisma as any).installationJob.findMany({
          where,
          include,
          orderBy: { createdAt: 'desc' },
        });
        const nameById = await this.technicianNameMap(jobs);
        const mapped = jobs.map((j: any) => this.mapJobToFrontend(j, nameById, preinstallJobIds));
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

  private lineItemsInclude() {
    return {
      where: { deletedAt: null },
      include: {
        product: {
          select: { id: true, productCode: true, onHand: true, landedCost: true },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    };
  }

  private baseJobInclude(withLineItems: boolean) {
    return {
      customer: true,
      vehicle: true,
      user: true,
      hardware: true,
      ...(withLineItems ? { lineItems: this.lineItemsInclude() } : {}),
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
    };
  }

  async getJob(id: string) {
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
    const itemSelectNoComments = { ...itemSelectFull } as any;
    delete itemSelectNoComments.comments;
    const itemSelectMinimal = { ...itemSelectNoComments };
    delete itemSelectMinimal.photos;

    const buildInclude = (withLineItems: boolean, itemSelect?: Record<string, boolean>) => ({
      customer: true,
      vehicle: true,
      user: true,
      hardware: true,
      ...(withLineItems ? { lineItems: this.lineItemsInclude() } : {}),
      checklistSections: itemSelect
        ? {
          orderBy: { id: 'asc' },
          include: {
            items: {
              select: itemSelect,
              orderBy: { displayOrder: 'asc' },
            },
          },
        }
        : {
          orderBy: { id: 'asc' },
        },
      timeline: {
        orderBy: { timestamp: 'desc' },
      },
    });

    const attempts = [
      () => this.baseJobInclude(true),
      () => this.baseJobInclude(false),
      () => buildInclude(false, itemSelectFull),
      () => buildInclude(false, itemSelectNoComments),
      () => buildInclude(false, itemSelectMinimal),
      () => buildInclude(false),
    ];

    let job: any;
    let lastError: any;
    for (const build of attempts) {
      try {
        job = await this.prisma.installationJob.findUnique({
          where: { id },
          include: build() as any,
        });
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`getJob include attempt failed: ${err?.message}`);
      }
    }

    if (lastError && !job) {
      throw new BadRequestException(
        lastError?.message || 'Failed to load installation job. Apply pending Prisma migrations.',
      );
    }

    if (!job) {
      throw new NotFoundException(`Installation job with ID ${id} not found`);
    }

    const nameById = await this.technicianNameMap([job]);
    const preinstall = await (this.prisma as any).fMPreinstall.findFirst({
      where: { installJobId: job.id },
      select: { installJobId: true },
    }).catch(() => null);
    const preinstallJobIds = preinstall?.installJobId ? new Set([preinstall.installJobId]) : new Set<string>();
    return this.mapJobToFrontend(job, nameById, preinstallJobIds);
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

    const techId = dto.technicianId || null;
    const assignedTo = dto.assignedTo && ['technician', 'contractor', 'subcontractor'].includes(dto.assignedTo)
      ? dto.assignedTo
      : 'technician';

    let job = await (this.prisma as any).installationJob.findFirst({
      where: {
        OR: [{ id }, { jobNumber }],
      },
    });

    if (job) {
      job = await (this.prisma as any).installationJob.update({
        where: { id: job.id },
        data: {
          customerId: customerId || job.customerId,
          vehicleId: vehicleId || job.vehicleId,
          location: dto.location || job.location,
          technicianId: techId || job.technicianId,
          userId: techId || job.userId,
          assignedTo: assignedTo || job.assignedTo,
          installationDate: dto.installationDate ? new Date(dto.installationDate) : job.installationDate,
          startTime: dto.startTime || job.startTime,
          endTime: dto.endTime || job.endTime,
          isScheduled: dto.isScheduled !== undefined ? !!dto.isScheduled : job.isScheduled,
          notes: dto.notes ? `${job.notes ? job.notes + ' | ' : ''}${dto.notes}` : job.notes,
        },
      });
    } else {
      job = await (this.prisma as any).installationJob.create({
        data: {
          id,
          jobNumber,
          customerId,
          projectId: dto.projectId || 'proj-fleet-telematics',
          vehicleId,
          location: dto.location || 'Main Workshop',
          technicianId: techId,
          userId: techId,
          assignedTo,
          installationDate: dto.installationDate ? new Date(dto.installationDate) : null,
          startTime: dto.startTime || null,
          endTime: dto.endTime || null,
          isScheduled: !!dto.isScheduled,
          status: dbStatus,
          notes: dto.notes || '',
          salesOrderId: dto.salesOrderId ?? undefined,
          timeline: {
            create: {
              status: dbStatus,
              updatedByName: 'Operations Dispatch',
              note: 'Job created',
            },
          },
        },
      });
    }

    const hardwareList: any[] = Array.isArray(dto.hardware) ? dto.hardware : [];
    const createdModels: string[] = [];
    for (const hw of hardwareList) {
      const dbModel = this.toDbHardwareModel(hw?.model) || 'MIX4000';
      const serial =
        hw?.serialNumber || `SN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      try {
        await (this.prisma as any).hardwareItem.create({
          data: {
            model: dbModel,
            name: hw?.name || `${this.toFrontendHardwareModel(dbModel) || dbModel} Unit`,
            category: this.toDbHardwareCategory(hw?.category),
            serialNumber: serial,
            imei: hw?.imei || null,
            allocatedJobId: job.id,
            status: 'ALLOCATED',
          },
        });
        createdModels.push(dbModel);
      } catch (err) {
        this.logger.warn(`Failed to attach hardware ${dbModel} on create: ${(err as Error)?.message}`);
      }
    }

    const modelsToAttach = createdModels.length > 0 ? createdModels : ['MIX4000'];
    await this.attachChecklistsForModels(job.id, modelsToAttach);

    return this.getJob(job.id);
  }

  async scheduleJob(
    id: string,
    payload: { technicianId: string; assignedTo: "technician" | "contractor" | "subcontractor", date: string; startTime: string; endTime: string; notes?: string }
  ) {
    const tech = await this.prisma.user.findUnique({
      where: { id: payload.technicianId },
      select: { id: true, displayName: true, firstName: true, lastName: true, email: true },
    });
    const techName = this.userDisplayName(tech) || 'Assigned Technician';

    const existing = await (this.prisma as any).installationJob.findUnique({
      where: { id },
      select: { status: true },
    });
    // Scheduling advances the job into the install flow
    const nextStatus =
      !existing?.status || existing.status === 'NOT_ACTIONED'
        ? 'WAITING_INSTALL'
        : existing.status;

    const job = await this.prisma.installationJob.update({
      where: { id },
      data: {
        technicianId: payload.technicianId,
        assignedTo: payload.assignedTo ?? 'technician',
        userId: payload.technicianId,
        installationDate: new Date(payload.date),
        startTime: payload.startTime,
        endTime: payload.endTime,
        isScheduled: true,
        status: nextStatus,
        notes: payload.notes !== undefined ? payload.notes : undefined,
        timeline: {
          create: {
            status: nextStatus,
            updatedByName: 'Scheduler',
            note: `Scheduled with technician ${techName} for ${payload.date} (${payload.startTime} - ${payload.endTime})`,
          },
        },
      },
    });

    return this.getJob(id);
  }

  async updateStatus(
    id: string,
    payload: { newStatus: string; note?: string; updatedBy?: string; bypassValidation?: boolean }
  ) {
    const flow = [
      'NOT_ACTIONED',
      'WORKSHOP_SETUP',
      'WAITING_INSTALL',
      'INSTALLED',
      'INVOICED',
      'COMPLETED',
    ] as const;

    const existing = await (this.prisma as any).installationJob.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException(`Installation job with ID ${id} not found`);
    }

    const dbStatus = statusMappingToDb[payload.newStatus] || payload.newStatus;
    const toIdx = flow.indexOf(dbStatus as typeof flow[number]);

    if (toIdx === -1) {
      throw new BadRequestException(`Invalid status: ${payload.newStatus}`);
    }

    const userNote = String(payload.note ?? '').trim();
    const timelineNote = userNote
      ? userNote
      : `Status transitioned to ${payload.newStatus}`;

    const job = await (this.prisma as any).installationJob.update({
      where: { id },
      data: {
        status: dbStatus,
        canInvoice: dbStatus === 'COMPLETED' || dbStatus === 'INSTALLED' || dbStatus === 'INVOICED',
        timeline: {
          create: {
            status: dbStatus,
            updatedByName: payload.updatedBy || 'Operations Dispatch',
            note: timelineNote,
          },
        },
      },
    });

    return this.getJob(id);
  }

  async addHardware(id: string, hardware: any) {
    const existing = await (this.prisma as any).installationJob.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Installation job with ID ${id} not found`);
    }

    const dbModel = this.toDbHardwareModel(hardware?.model) || 'MIX4000';
    const serial =
      hardware?.serialNumber || `SN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    await (this.prisma as any).hardwareItem.create({
      data: {
        model: dbModel,
        name: hardware?.name || `${this.toFrontendHardwareModel(dbModel) || dbModel} Unit`,
        category: this.toDbHardwareCategory(hardware?.category),
        serialNumber: serial,
        imei: hardware?.imei || null,
        allocatedJobId: id,
        status: 'ALLOCATED',
      },
    });

    await this.attachChecklistsForModels(id, [dbModel]);
    return this.getJob(id);
  }

  async removeHardware(id: string, hardwareId: string) {
    await (this.prisma as any).hardwareItem.deleteMany({
      where: { id: hardwareId, allocatedJobId: id },
    });

    return this.getJob(id);
  }

  /** Build missing checklist sections from ACTIVE templates for hardware already on the job. */
  async regenerateChecklist(id: string) {
    const job = await (this.prisma as any).installationJob.findUnique({
      where: { id },
      include: { hardware: true },
    });
    if (!job) {
      throw new NotFoundException(`Installation job with ID ${id} not found`);
    }

    const models = (job.hardware || []).map((h: any) => h.model).filter(Boolean);
    const modelsToAttach = models.length > 0 ? models : ['MIX4000'];

    await this.attachChecklistsForModels(id, modelsToAttach);
    return this.getJob(id);
  }

  private lineTotal(qty: number, unitPrice: number, discountPct: number) {
    return Number((qty * unitPrice * (1 - (discountPct || 0) / 100)).toFixed(2));
  }

  async addLineItem(id: string, body: any) {
    const job = await (this.prisma as any).installationJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Installation job with ID ${id} not found`);

    const productId = String(body.productId || body.itemId || '').trim();
    const productCodeHint = String(body.partNo || body.productCode || '').trim();
    if (!productId && !productCodeHint) {
      throw new BadRequestException('Product is required — select an item from the list.');
    }

    // Resolve by id first, then product code (stock qty is NOT a reason to reject)
    let product = productId
      ? await this.prisma.product.findFirst({
        where: { id: productId },
        select: {
          id: true,
          productCode: true,
          name: true,
          retailPrice: true,
          landedCost: true,
          deletedAt: true,
          isActive: true,
        },
      })
      : null;

    if (!product && (productCodeHint || productId)) {
      product = await this.prisma.product.findFirst({
        where: {
          productCode: { equals: productCodeHint || productId, mode: 'insensitive' },
        },
        select: {
          id: true,
          productCode: true,
          name: true,
          retailPrice: true,
          landedCost: true,
          deletedAt: true,
          isActive: true,
        },
      });
    }

    if (!product) {
      throw new BadRequestException(
        `Product not found (${productCodeHint || productId}). Select the item again.`,
      );
    }
    if (product.deletedAt) {
      throw new BadRequestException(
        `Product ${product.productCode} has been deleted and cannot be added.`,
      );
    }
    if (product.isActive === false) {
      throw new BadRequestException(
        `Product ${product.productCode} is inactive and cannot be added.`,
      );
    }

    const quantity = Math.max(1, Number(body.quantity ?? 1) || 1);
    const unitPrice = Number(body.unitPrice ?? product.retailPrice ?? 0) || 0;
    const discountPct = Number(body.discountPct ?? 0) || 0;
    const landedCost = Number(body.landedCost ?? product.landedCost ?? 0) || 0;
    const description = String(body.description || product.name || product.productCode).trim();

    try {
      await (this.prisma as any).installationJobItem.create({
        data: {
          jobId: id,
          productId: product.id,
          partNo: product.productCode,
          description,
          quantity,
          unitPrice,
          discountPct,
          landedCost,
          lineTotal: this.lineTotal(quantity, unitPrice, discountPct),
        },
      });
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (/InstallationJobItem does not exist/i.test(msg)) {
        throw new BadRequestException(
          'Line items are not set up on this server yet. Run database migrations (InstallationJobItem).',
        );
      }
      if (/Foreign key constraint/i.test(msg) && /productId/i.test(msg)) {
        throw new BadRequestException(
          `Product ${product.productCode} could not be linked. Select the item again.`,
        );
      }
      throw new BadRequestException(
        msg.split('\n').map((l: string) => l.trim()).filter(Boolean).pop() || 'Failed to add line item',
      );
    }

    return this.getJob(id);
  }

  async updateLineItem(id: string, itemId: string, body: any) {
    const existing = await (this.prisma as any).installationJobItem.findFirst({
      where: { id: itemId, jobId: id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Line item not found');

    const quantity = body.quantity !== undefined
      ? Math.max(1, Number(body.quantity) || 1)
      : Number(existing.quantity);
    const unitPrice = body.unitPrice !== undefined
      ? Number(body.unitPrice) || 0
      : Number(existing.unitPrice);
    const discountPct = body.discountPct !== undefined
      ? Number(body.discountPct) || 0
      : Number(existing.discountPct);

    await (this.prisma as any).installationJobItem.update({
      where: { id: itemId },
      data: {
        ...(body.description !== undefined ? { description: String(body.description) } : {}),
        quantity,
        unitPrice,
        discountPct,
        lineTotal: this.lineTotal(quantity, unitPrice, discountPct),
      },
    });

    return this.getJob(id);
  }

  async removeLineItem(id: string, itemId: string) {
    await (this.prisma as any).installationJobItem.updateMany({
      where: { id: itemId, jobId: id, deletedAt: null },
      data: { deletedAt: new Date() },
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
      where: { id: itemId, sectionId },
      data: {
        completed: payload.completed !== undefined ? payload.completed : undefined,
        notes: payload.notes !== undefined ? payload.notes : undefined,
        completedByName: payload.completedBy || undefined,
        completedAt: payload.completed ? new Date() : null,
      },
    });

    const job = await this.getJob(id);
    return { item: { id: itemId, ...payload }, job };
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

  async addChecklistComment(
    jobId: string,
    sectionId: string,
    itemId: string,
    payload: { text: string; authorName?: string },
  ) {
    const text = String(payload?.text ?? '').trim();
    if (!text) {
      throw new BadRequestException('Comment text is required');
    }
    if (text.length > 2000) {
      throw new BadRequestException('Comment must be 2000 characters or fewer');
    }

    const item = await (this.prisma as any).jobChecklistItem.findFirst({
      where: { id: itemId, sectionId },
      select: {
        id: true,
        comments: true,
        notes: true,
        checklistSection: { select: { jobId: true } },
      },
    });
    if (!item || item.checklistSection?.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found on this job');
    }

    const comment = {
      id: randomUUID(),
      text,
      authorName: String(payload?.authorName || 'Installer').trim() || 'Installer',
      createdAt: new Date().toISOString(),
    };

    const hasStoredComments = Array.isArray(item.comments) && item.comments.length > 0;
    let base = this.parseComments(item.comments);
    if (!hasStoredComments && String(item.notes ?? '').trim()) {
      base = [
        {
          id: randomUUID(),
          text: String(item.notes).trim(),
          authorName: 'Installer',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const merged = [...base, comment];
    await (this.prisma as any).jobChecklistItem.update({
      where: { id: itemId },
      data: { comments: merged },
    });

    const job = await this.getJob(jobId);
    return { comment, job };
  }

  async removeChecklistComment(
    jobId: string,
    sectionId: string,
    itemId: string,
    commentId: string,
  ) {
    const item = await (this.prisma as any).jobChecklistItem.findFirst({
      where: { id: itemId, sectionId },
      select: {
        id: true,
        comments: true,
        notes: true,
        checklistSection: { select: { jobId: true } },
      },
    });
    if (!item || item.checklistSection?.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found on this job');
    }

    const hasStoredComments = Array.isArray(item.comments) && item.comments.length > 0;
    const existing = hasStoredComments
      ? this.parseComments(item.comments)
      : this.parseComments(item.comments, item.notes);

    const next = existing
      .filter((c) => c.id !== commentId)
      .map((c) =>
        c.id === 'legacy-note'
          ? {
            id: randomUUID(),
            text: c.text,
            authorName: c.authorName || 'Installer',
            createdAt: c.createdAt || new Date().toISOString(),
          }
          : c,
      );

    if (next.length === existing.length) {
      throw new NotFoundException('Comment not found');
    }

    await (this.prisma as any).jobChecklistItem.update({
      where: { id: itemId },
      data: {
        comments: next,
        ...(commentId === 'legacy-note' ? { notes: null } : {}),
      },
    });

    const job = await this.getJob(jobId);
    return { success: true, job };
  }

  async addChecklistPhoto(
    jobId: string,
    sectionId: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No photo file uploaded');
    }

    const item = await (this.prisma as any).jobChecklistItem.findFirst({
      where: { id: itemId, sectionId },
      select: { id: true, photos: true, checklistSection: { select: { jobId: true } } },
    });
    if (!item || item.checklistSection?.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found on this job');
    }

    const ext = (extname(file.originalname || '') || '.jpg').toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'];
    if (!allowed.includes(ext)) {
      throw new BadRequestException('Only image files are allowed (jpg, png, webp, gif)');
    }

    const photoId = randomUUID();
    const blobName = `checklist/${jobId}/${itemId}/${photoId}${ext}`;
    const contentType = file.mimetype || 'image/jpeg';
    const url = await this.azure.upload('media', blobName, file.buffer, contentType);

    const photo = {
      id: photoId,
      url,
      blobName,
      fileName: file.originalname || `${photoId}${ext}`,
      createdAt: new Date().toISOString(),
    };

    const photos = [...this.parsePhotos(item.photos), photo];
    await (this.prisma as any).jobChecklistItem.update({
      where: { id: itemId },
      data: { photos },
    });

    const clientPhoto = {
      id: photoId,
      url: `/installations/${jobId}/checklist/${sectionId}/items/${itemId}/photos/${photoId}/file`,
      blobName,
      fileName: file.originalname || `${photoId}${ext}`,
      createdAt: photo.createdAt,
    };

    const job = await this.getJob(jobId);
    return { photo: clientPhoto, job };
  }

  private resolvePhotoBlobName(photo: {
    url?: string;
    blobName?: string;
  }): string | null {
    if (photo.blobName) return photo.blobName;
    if (!photo.url) return null;
    const marker = '/media/';
    const idx = photo.url.indexOf(marker);
    if (idx < 0) return null;
    // Strip query string (SAS) if present
    const raw = photo.url.slice(idx + marker.length).split('?')[0];
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  async getChecklistPhotoFile(
    jobId: string,
    sectionId: string,
    itemId: string,
    photoId: string,
  ) {
    const item = await (this.prisma as any).jobChecklistItem.findFirst({
      where: { id: itemId, sectionId },
      select: { id: true, photos: true, checklistSection: { select: { jobId: true } } },
    });

    let photo = this.parsePhotos(item?.photos).find((p) => p.id === photoId);

    // Fallback across all checklist items for this job in case of direct lookups
    if (!photo) {
      const allJobItems = await (this.prisma as any).jobChecklistItem.findMany({
        where: { checklistSection: { jobId } },
        select: { photos: true },
      });
      for (const it of allJobItems) {
        const found = this.parsePhotos(it.photos).find((p) => p.id === photoId);
        if (found) {
          photo = found;
          break;
        }
      }
    }

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const blobName = this.resolvePhotoBlobName(photo);
    if (!blobName) {
      throw new NotFoundException('Photo blob path missing');
    }

    return this.azure.download('media', blobName);
  }

  async removeChecklistPhoto(
    jobId: string,
    sectionId: string,
    itemId: string,
    photoId: string,
  ) {
    const item = await (this.prisma as any).jobChecklistItem.findFirst({
      where: { id: itemId, sectionId },
      select: { id: true, photos: true, checklistSection: { select: { jobId: true } } },
    });
    if (!item || item.checklistSection?.jobId !== jobId) {
      throw new NotFoundException('Checklist item not found on this job');
    }

    const photos = this.parsePhotos(item.photos);
    const target = photos.find((p) => p.id === photoId);
    if (!target) {
      throw new NotFoundException('Photo not found');
    }

    const next = photos.filter((p) => p.id !== photoId);
    await (this.prisma as any).jobChecklistItem.update({
      where: { id: itemId },
      data: { photos: next },
    });

    // Best-effort Azure blob cleanup
    try {
      const blobName = this.resolvePhotoBlobName(target);
      if (blobName) {
        await this.azure.delete('media', blobName);
      }
    } catch (e) {
      this.logger.warn(`Failed to delete checklist photo blob ${photoId}: ${e}`);
    }

    const job = await this.getJob(jobId);
    return { success: true, job };
  }

  private mapJobToFrontend(j: any, nameById?: Map<string, string>, preinstallJobIds?: Set<string>) {
    const techId = j.technicianId || j.userId || undefined;
    const technicianName =
      this.userDisplayName(j.user) ||
      (techId ? nameById?.get(techId) : undefined) ||
      undefined;

    const isPreinstall =
      Boolean(preinstallJobIds?.has(j.id)) ||
      Boolean(j.jobNumber && (j.jobNumber.startsWith('JOB-PI-') || j.jobNumber.startsWith('JOB-BULK-'))) ||
      Boolean(j.id && j.id.startsWith('INSTALL-BULK')) ||
      Boolean(j.notes && /fm preinstall|preinstall|bulk rollout/i.test(j.notes));

    const isSalesOrder =
      Boolean(j.salesOrderId) ||
      Boolean(j.jobNumber && (j.jobNumber.startsWith('JOB-SO-') || j.jobNumber.startsWith('SO-'))) ||
      Boolean(j.id && j.id.startsWith('SO-')) ||
      Boolean(j.notes && /sales order|so-\d+/i.test(j.notes));

    const jobSource: 'Whiteboard' | 'FM Pre-Installation' | 'Sales Order' = isSalesOrder
      ? 'Sales Order'
      : isPreinstall
        ? 'FM Pre-Installation'
        : 'Whiteboard';

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
      salesOrderId: j.salesOrderId || undefined,
      isWhiteboard: jobSource === 'Whiteboard',
      jobType: jobSource === 'FM Pre-Installation' ? 'FM Preinstall' : jobSource,
      sourceType: jobSource === 'Sales Order' ? 'SALES_ORDER' : jobSource === 'FM Pre-Installation' ? 'FM_PREINSTALL' : 'WHITEBOARD',
      jobSource,
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
