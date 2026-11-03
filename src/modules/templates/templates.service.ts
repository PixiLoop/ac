// checklist-templates.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Adjust import according to your project setup
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  AddSectionDto,
  AddItemDto,
  UpdateItemDto,
} from './dto/create-template.dto';

@Injectable()
export class ChecklistTemplatesService {
  constructor(private readonly prisma: PrismaService) { }

  private toFrontendHardwareModel(model?: string | null) {
    const map: Record<string, string> = {
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
    if (!model) return model;
    return map[model] || model;
  }

  private toFrontendCategory(category?: string | null) {
    const map: Record<string, string> = {
      TELEMATICS_UNIT: 'Telematics Unit',
      CAMERA_AND_VIDEO: 'Camera & Video',
      CONNECTIVITY: 'Connectivity',
      SENSORS: 'Sensors',
      CORE_UNIT: 'Core Unit',
      ACCESSORIES: 'Accessories',
    };
    if (!category) return category;
    return map[category] || category;
  }

  private toDbHardwareModel(model?: string | null) {
    const map: Record<string, string> = {
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
    if (!model) return model;
    return map[model] || model;
  }

  private toDbCategory(category?: string | null) {
    const map: Record<string, string> = {
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
    if (!category) return category;
    return map[category] || category;
  }

  // Standardize return payload to match frontend ChecklistTemplate shape
  private formatTemplate(template: any) {
    return {
      id: template.id,
      name: template.name,
      hardwareType: template.hardwareType,
      hardwareModel: this.toFrontendHardwareModel(template.hardwareModel),
      category: this.toFrontendCategory(template.category),
      description: template.description || '',
      version: template.version,
      status: template.status,
      lastUpdated: template.lastUpdated ? template.lastUpdated.toISOString().split('T')[0] : '',
      sections: (template.sections || [])
        .sort((a: { displayOrder: number; }, b: { displayOrder: number; }) => a.displayOrder - b.displayOrder)
        .map((sec: { id: any; title: any; displayOrder: any; items: any; }) => ({
          id: sec.id,
          title: sec.title,
          displayOrder: sec.displayOrder,
          items: (sec.items || [])
            .sort((a: { displayOrder: number; }, b: { displayOrder: number; }) => a.displayOrder - b.displayOrder)
            .map((item: { id: any; title: any; description: any; isRequired: any; displayOrder: any; }) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              section: sec.title,
              isRequired: item.isRequired,
              displayOrder: item.displayOrder,
            })),
        })),
      FMServiceSegment: template?.FMServiceSegment
    };
  }

  async ensureDefaultTemplates() {
    try {
      const count = await this.prisma.checklistTemplate.count({
        where: { status: 'ACTIVE' },
      });
      if (count > 0) return;

      const mixSegment = await this.prisma.fMServiceSegment.findFirst({
        where: { code: 'MIX4000' },
      });

      if (mixSegment) {
        await this.prisma.checklistTemplate.create({
          data: {
            name: 'MiX4000 Fleet Telematics Commissioning Checklist',
            fmSegmentId: mixSegment.id,
            status: 'ACTIVE',
            sections: {
              create: [
                {
                  title: 'Pre-Installation & Safety Verification',
                  displayOrder: 1,
                  items: {
                    create: [
                      {
                        title: 'Verify vehicle ignition OFF and isolate auxiliary battery',
                        description: 'Essential safety check prior to vehicle wiring harness modification',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Inspect physical mounting clearance behind dashboard/trim',
                        description: 'Ensure adequate airflow and zero obstruction with vehicle steering/pedal linkages',
                        isRequired: true,
                        displayOrder: 2,
                      },
                      {
                        title: 'Confirm unit serial number & SIM allocation match work order',
                        description: 'Verify hardware matches digital dispatch records',
                        isRequired: true,
                        displayOrder: 3,
                      },
                    ],
                  },
                },
                {
                  title: 'Mounting & Wiring Harness',
                  displayOrder: 2,
                  items: {
                    create: [
                      {
                        title: 'Securely mount unit bracket using automotive-grade ties/hardware',
                        description: 'Unit must be vibration-resistant and firmly anchored to subframe',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Connect constant 12V/24V power, chassis ground, and ignition sense',
                        description: 'Solder or crimp heat-shrink inline blade fuses according to specification',
                        isRequired: true,
                        displayOrder: 2,
                      },
                      {
                        title: 'Position GPS & cellular antenna with clear line-of-sight to sky',
                        description: 'Mount on windshield or top dash; avoid metal overhangs',
                        isRequired: true,
                        displayOrder: 3,
                      },
                    ],
                  },
                },
                {
                  title: 'CAN-Bus Telematics & Sensor Integration',
                  displayOrder: 3,
                  items: {
                    create: [
                      {
                        title: 'Tap CAN-High and CAN-Low vehicle bus wiring using OEM-grade twisted pair',
                        description: 'Connect to vehicle FMS gateway or OBD-II port as specified',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Verify digital inputs for PTO / auxiliary sensors',
                        description: 'Test digital input voltage states with multimeter',
                        isRequired: false,
                        displayOrder: 2,
                      },
                    ],
                  },
                },
                {
                  title: 'Function Testing & Evidence Sign-Off',
                  displayOrder: 4,
                  items: {
                    create: [
                      {
                        title: 'Cycle vehicle ignition and verify status LED indicators',
                        description: 'Confirm solid cellular registration and satellite fix lock',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Capture photographic evidence of installed hardware & fuse tap',
                        description: 'Upload high-resolution photo for QA sign-off verification',
                        isRequired: true,
                        displayOrder: 2,
                      },
                      {
                        title: 'Tidy wiring loom with loom tape and reinstall all trim panels',
                        description: 'Return vehicle cabin to OEM clean condition',
                        isRequired: true,
                        displayOrder: 3,
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      }

      const fm3306Segment = await this.prisma.fMServiceSegment.findFirst({
        where: { code: 'FM3306' },
      });

      if (fm3306Segment) {
        await this.prisma.checklistTemplate.create({
          data: {
            name: 'FM3306 Fleet Installation Checklist',
            fmSegmentId: fm3306Segment.id,
            status: 'ACTIVE',
            sections: {
              create: [
                {
                  title: 'Pre-Install Inspection',
                  displayOrder: 1,
                  items: {
                    create: [
                      {
                        title: 'Confirm vehicle voltage supply (12V/24V) and isolate battery',
                        description: 'Verify electrical system stability before tapping harness',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Verify FM3306 IMEI and active M2M SIM card configuration',
                        description: 'Check APN settings and SIM ICCID match work order',
                        isRequired: true,
                        displayOrder: 2,
                      },
                    ],
                  },
                },
                {
                  title: 'Hardware & Loom Installation',
                  displayOrder: 2,
                  items: {
                    create: [
                      {
                        title: 'Secure FM3306 device behind instrument cluster',
                        description: 'Mount securely away from moving linkages and heat sources',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Connect main power harness and inline blade fuse',
                        description: 'Verify 3A inline fuse installed on permanent 12V/24V feed',
                        isRequired: true,
                        displayOrder: 2,
                      },
                      {
                        title: 'Route external antenna to windscreen header panel',
                        description: 'Clean glass with isopropanol alcohol wipe and affix antenna',
                        isRequired: true,
                        displayOrder: 3,
                      },
                    ],
                  },
                },
                {
                  title: 'Commissioning & Photo Sign-Off',
                  displayOrder: 3,
                  items: {
                    create: [
                      {
                        title: 'Verify GPS fix lock and server telematics ping',
                        description: 'Check diagnostic portal for live telemetry data stream',
                        isRequired: true,
                        displayOrder: 1,
                      },
                      {
                        title: 'Upload photographic verification of installation and serial tag',
                        description: 'Take high-clarity photo of unit mounting and fuse tap',
                        isRequired: true,
                        displayOrder: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      }
    } catch (e: any) {
      // Non-fatal if DB is offline or already seeded
    }
  }

  async findAll(params?: { search?: string; category?: string }) {
    await this.ensureDefaultTemplates();
    const where: any = {};

    if (params?.category && params.category !== 'All') {
      where.category = params.category;
    }

    if (params?.search) {
      const q = params.search;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { hardwareType: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const templates = await this.prisma.checklistTemplate.findMany({
        where,
        include: {
          sections: {
            include: {
              items: true,
            },
          },
          FMServiceSegment: true
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formatted = templates.map((t) => this.formatTemplate(t));
      return { data: formatted, total: formatted.length };
    } catch (err: any) {
      console.warn(`[ChecklistTemplatesService] Database offline; returning standard built-in templates: ${err?.message}`);
      return {
        data: [
          {
            id: 'tmpl-mix4000',
            name: 'MIX4000 Telematics Pre-Install Checklist',
            hardwareType: 'MIX4000',
            fmSegmentId: 'seg-mix4000',
            category: 'Standard Fleet',
            description: 'Standard telematics verification and functional checklist for MIX4000 units',
            isActive: true,
            sections: [
              {
                id: 'sec-mix-prep',
                title: 'Device & Harness Verification',
                displayOrder: 1,
                items: [
                  { id: 'itm-mix-1', title: 'Verify serial and IMEI against preinstall work order', isRequired: true, displayOrder: 1, requiresPhoto: false },
                  { id: 'itm-mix-2', title: 'Inspect power loom fuse ratings (3A constant, 2A ignition)', isRequired: true, displayOrder: 2, requiresPhoto: false },
                  { id: 'itm-mix-3', title: 'Confirm internal SIM card is seated and APN configured', isRequired: true, displayOrder: 3, requiresPhoto: false },
                ],
              },
              {
                id: 'sec-mix-mount',
                title: 'Installation & Physical Mounting',
                displayOrder: 2,
                items: [
                  { id: 'itm-mix-4', title: 'Secure MIX4000 main body with cable ties behind dash', isRequired: true, displayOrder: 1, requiresPhoto: true },
                  { id: 'itm-mix-5', title: 'Route GPS/cellular antenna with unobstructed skyward view', isRequired: true, displayOrder: 2, requiresPhoto: true },
                  { id: 'itm-mix-6', title: 'Solder and heat-shrink all primary power connections', isRequired: true, displayOrder: 3, requiresPhoto: true },
                ],
              },
              {
                id: 'sec-mix-qa',
                title: 'Signoff & Telematics Verification',
                displayOrder: 3,
                items: [
                  { id: 'itm-mix-7', title: 'Observe LED status: solid green GPS fix, blinking cellular', isRequired: true, displayOrder: 1, requiresPhoto: false },
                  { id: 'itm-mix-8', title: 'Confirm ping received in server commissioning tool', isRequired: true, displayOrder: 2, requiresPhoto: false },
                  { id: 'itm-mix-9', title: 'Capture photo of completed dash reassembly', isRequired: true, displayOrder: 3, requiresPhoto: true },
                ],
              },
            ],
          },
          {
            id: 'tmpl-fm3306',
            name: 'FM3306 Advanced Telematics Checklist',
            hardwareType: 'FM3306',
            fmSegmentId: 'seg-fm3306',
            category: 'Advanced Telematics',
            description: 'Heavy vehicle checklist with CAN bus integration and peripheral sensor validation',
            isActive: true,
            sections: [
              {
                id: 'sec-fm33-prep',
                title: 'Pre-Install CAN & Power Setup',
                displayOrder: 1,
                items: [
                  { id: 'itm-fm33-1', title: 'Check vehicle battery voltage (12V / 24V compatibility)', isRequired: true, displayOrder: 1, requiresPhoto: false },
                  { id: 'itm-fm33-2', title: 'Locate CAN High & CAN Low pairs using schematic', isRequired: true, displayOrder: 2, requiresPhoto: false },
                ],
              },
              {
                id: 'sec-fm33-mount',
                title: 'Unit Placement & Wiring',
                displayOrder: 2,
                items: [
                  { id: 'itm-fm33-3', title: 'Install CAN contact clamp without piercing wire cores', isRequired: true, displayOrder: 1, requiresPhoto: true },
                  { id: 'itm-fm33-4', title: 'Firmly mount FM3306 unit to chassis bracket', isRequired: true, displayOrder: 2, requiresPhoto: true },
                ],
              },
              {
                id: 'sec-fm33-qa',
                title: 'Diagnostic Test & Handover',
                displayOrder: 3,
                items: [
                  { id: 'itm-fm33-5', title: 'Read live CAN engine telemetry (RPM, odometer, fuel)', isRequired: true, displayOrder: 1, requiresPhoto: false },
                  { id: 'itm-fm33-6', title: 'Capture final wiring harness neatness photo', isRequired: true, displayOrder: 2, requiresPhoto: true },
                ],
              },
            ],
          },
        ],
        total: 2,
      };
    }
  }

  async findOne(id: string) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return this.formatTemplate(template);
  }

  async create(dto: CreateChecklistTemplateDto) {
    const template = await this.prisma.checklistTemplate.create({
      data: {
        name: dto.name,
        fmSegmentId: dto.hardwareId ?? null,
        status: dto.status || 'ACTIVE',
        sections: {
          create: (dto.sections || []).map((sec, sIdx) => ({
            title: sec.title,
            // Guarantee unique sequential displayOrder per section within this template
            displayOrder: sIdx + 1,
            items: {
              create: (sec.items || []).map((item, iIdx) => ({
                title: item.title,
                description: item.description,
                isRequired: item.isRequired ?? true,
                // Guarantee unique sequential displayOrder per item within this section
                displayOrder: iIdx + 1,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: { items: true },
        },
      },
    });

    return this.formatTemplate(template);
  }

  async update(id: string, dto: UpdateChecklistTemplateDto) {
    await this.findOne(id); // Ensure existence

    const updateData: any = { ...dto, lastUpdated: new Date() };

    const updated = await this.prisma.checklistTemplate.update({
      where: { id },
      data: updateData,
      include: {
        sections: {
          include: { items: true },
        },
      },
    });

    return this.formatTemplate(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.checklistTemplate.delete({
      where: { id },
    });
    return { success: true, id };
  }

  // Section Endpoints
  async addSection(templateId: string, dto: AddSectionDto) {
    // Find highest current displayOrder for this template
    const maxSection = await this.prisma.checklistTemplateSection.findFirst({
      where: { templateId },
      orderBy: { displayOrder: 'desc' },
    });

    const nextOrder = dto.displayOrder ?? ((maxSection?.displayOrder ?? 0) + 1);

    const section = await this.prisma.checklistTemplateSection.create({
      data: {
        templateId,
        title: dto.title,
        displayOrder: nextOrder,
      },
      include: { items: true },
    });

    await this.prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { lastUpdated: new Date() },
    });

    return section;
  }

  async deleteSection(templateId: string, sectionId: string) {
    await this.prisma.checklistTemplateSection.delete({
      where: { id: sectionId },
    });

    await this.prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { lastUpdated: new Date() },
    });

    return { success: true, sectionId };
  }

  // Item Endpoints
  async addItem(templateId: string, sectionId: string, dto: AddItemDto) {
    const section = await this.prisma.checklistTemplateSection.findUnique({
      where: { id: sectionId },
      include: { items: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    const nextOrder = dto.displayOrder ?? (section.items.length + 1);

    const item = await this.prisma.checklistTemplateItem.create({
      data: {
        sectionId,
        title: dto.title,
        description: dto.description,
        isRequired: dto.isRequired ?? true,
        displayOrder: nextOrder,
      },
    });

    await this.prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { lastUpdated: new Date() },
    });

    return item;
  }

  async updateItem(templateId: string, sectionId: string, itemId: string, dto: UpdateItemDto) {
    const item = await this.prisma.checklistTemplateItem.update({
      where: { id: itemId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
    });

    await this.prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { lastUpdated: new Date() },
    });

    return item;
  }

  async deleteItem(templateId: string, sectionId: string, itemId: string) {
    await this.prisma.checklistTemplateItem.delete({
      where: { id: itemId },
    });

    await this.prisma.checklistTemplate.update({
      where: { id: templateId },
      data: { lastUpdated: new Date() },
    });

    return { success: true, itemId };
  }
}