import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface LocationListQuery {
  search?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
}

export interface CreateLocationDto {
  code: string;
  name: string;
  aisle?: string;
  bay?: string;
  level?: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateLocationDto = Partial<CreateLocationDto>;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return (this.prisma as any).invLocation;
  }

  async list(query: LocationListQuery = {}) {
    const { search, isActive, skip = 0, take = 50 } = query;

    const where: Record<string, any> = {
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { aisle: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.db.findMany({
        where,
        skip,
        take,
        orderBy: [{ aisle: 'asc' }, { bay: 'asc' }, { level: 'asc' }],
        include: {
          _count: { select: { productLocations: true } },
        },
      }),
      this.db.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findById(id: string) {
    const loc = await this.db.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { productLocations: true } },
      },
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async create(dto: CreateLocationDto) {
    const existing = await this.db.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Location code '${dto.code}' already exists`);

    return this.db.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findById(id);

    if (dto.code) {
      const conflict = await this.db.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (conflict) throw new ConflictException(`Location code '${dto.code}' already exists`);
    }

    return this.db.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const loc = await this.findById(id);
    if (loc._count.productLocations > 0) {
      throw new ConflictException(
        `Cannot delete — ${loc._count.productLocations} product(s) linked to this location.`,
      );
    }
    return this.db.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async toggleActive(id: string) {
    const loc = await this.findById(id);
    return this.db.update({ where: { id }, data: { isActive: !loc.isActive } });
  }
}