import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTechniciansDto } from './dto/technicians.dto';

@Injectable()
export class TechniciansService {
  private readonly logger = new Logger(TechniciansService.name);

  constructor(private prisma: PrismaService) {}

  async getAllTechnicians(query: Record<string, any> = {}) {
    const { search, skip, take, sortKey, sortDir } = query;

    const where: any = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
          { depot: { contains: search, mode: 'insensitive' } },
          { role: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    Object.keys(query).forEach((key) => {
      if (key.startsWith('filter_') && query[key]) {
        const field = key.replace('filter_', '');
        const rawValue = query[key];
        const values = Array.isArray(rawValue)
          ? rawValue
          : String(rawValue).split(',').filter(Boolean);

        if (values.length > 0) {
          where.AND.push({
            [field]: { in: values },
          });
        }
      }
    });

    if (where.AND.length === 0) {
      delete where.AND;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortKey && sortDir) {
      orderBy = { [sortKey]: String(sortDir).toLowerCase() };
    }

    const skipNum = skip !== undefined ? parseInt(String(skip), 10) : undefined;
    const takeNum = take !== undefined ? parseInt(String(take), 10) : undefined;

    const [technicians, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                isTechnician: true
              }
            }
          }
        },
        skip: skipNum,
        take: takeNum,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: technicians, total };
  }

  async findOne(id: string) {
    const technician = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!technician) {
      throw new NotFoundException(`Technician with ID ${id} not found`);
    }
    return technician;
  }
}