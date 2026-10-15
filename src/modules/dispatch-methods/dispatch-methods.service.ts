import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispatchMethodDto, UpdateDispatchMethodDto } from './dto/dispatch-method.dto';

@Injectable()
export class DispatchMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(activeOnly?: string) {
    return this.prisma.dispatchMethod.findMany({
      where: activeOnly === 'true' ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async create(dto: CreateDispatchMethodDto) {
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.dispatchMethod.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`Dispatch method "${code}" already exists`);

    return this.prisma.dispatchMethod.create({
      data: { code, label: dto.label, sortOrder: dto.sortOrder ?? null },
    });
  }

  async update(id: string, dto: UpdateDispatchMethodDto) {
    const existing = await this.prisma.dispatchMethod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dispatch method not found');

    return this.prisma.dispatchMethod.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  // Soft delete only — deactivates so it drops out of new-selection dropdowns,
  // but existing CustomerDispatch/Invoice records that already reference this
  // code keep displaying it correctly (no orphaned/broken historical data).
  async remove(id: string) {
    const existing = await this.prisma.dispatchMethod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dispatch method not found');

    return this.prisma.dispatchMethod.update({
      where: { id },
      data: { isActive: false },
    });
  }
}