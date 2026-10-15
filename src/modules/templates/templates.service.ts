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

  // Standardize return payload to match frontend ChecklistTemplate shape
  private formatTemplate(template: any) {
    return {
      id: template.id,
      name: template.name,
      hardwareType: template.hardwareType,
      hardwareModel: template.hardwareModel,
      category: template.category,
      description: template.description || '',
      version: template.version,
      status: template.status === 'ACTIVE' ? 'Active' : template.status === 'DRAFT' ? 'Draft' : 'Archived',
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
    };
  }

  async findAll(params?: { search?: string; category?: string }) {
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

    const templates = await this.prisma.checklistTemplate.findMany({
      where,
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = templates.map((t) => this.formatTemplate(t));
    return { data: formatted, total: formatted.length };
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
        hardwareType: dto.hardwareType,
        hardwareModel: dto.hardwareModel,
        category: dto.category,
        description: dto.description ?? "",
        version: dto.version || 'v1.0',
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