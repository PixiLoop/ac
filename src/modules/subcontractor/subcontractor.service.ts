import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubContractorService {
  private readonly logger = new Logger(SubContractorService.name);

  constructor(private prisma: PrismaService) {}

  async getAllSubContractor(query: Record<string, any> = {}) {
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

    const [subcontractors, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                isSubContractor: true
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

    return { items: subcontractors, total };
  }
}