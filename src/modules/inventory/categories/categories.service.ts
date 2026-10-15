import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const db = (prisma: PrismaService) => (prisma as any).invCategory;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { search?: string; skip?: number; take?: number; sortKey?: string; sortDir?: 'asc' | 'desc' } = {}) {
    const { search, skip = 0, take = 20, sortKey = 'name', sortDir = 'asc' } = query;

    const where: Record<string, any> = {
      deletedAt: null,
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      db(this.prisma).findMany({ where, skip, take, orderBy: { [sortKey]: sortDir } }),
      db(this.prisma).count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findById(id: string) {
    const category = await db(this.prisma).findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await db(this.prisma).findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Category code '${dto.code}' already exists`);

    return db(this.prisma).create({
      data: {
        code:        dto.code,
        name:        dto.name,
        description: dto.description,
        isActive:    dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);

    if (dto.code) {
      const conflict = await db(this.prisma).findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new ConflictException(`Category code '${dto.code}' already exists`);
    }

    return db(this.prisma).update({
      where: { id },
      data: {
        ...(dto.code        !== undefined && { code: dto.code }),
        ...(dto.name        !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive    !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return db(this.prisma).update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
