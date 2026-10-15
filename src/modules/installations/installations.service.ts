import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ListAssignedParams = {
  userId: string;
  skip?: number;
  take?: number;
  status?: string;
  search?: string;
};

@Injectable()
export class InstallationsService {
  private readonly logger = new Logger(InstallationsService.name);

  constructor(private prisma: PrismaService) { }

  async getAllDispatches(query: Record<string, any> = {}) {
    const { search, skip, take, sortKey, sortDir } = query;

    const where: any = { AND: [] };

    // 1. Global text search filter
    if (search) {
      where.AND.push({
        OR: [
          { dispatchNumber: { contains: search, mode: 'insensitive' } },
          { conNote: { contains: search, mode: 'insensitive' } },
          { shippingAddress: { contains: search, mode: 'insensitive' } },
          {
            DispatchedInvoices: {
              some: {
                Invoice: {
                  invoiceNumber: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    // 2. Dynamic column multi-select filters (e.g., filter_dispatchNumber, filter_conNote)
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

    // 3. Dynamic sorting
    let orderBy: any = { dispatchDate: 'desc' };
    if (sortKey && sortDir) {
      orderBy = { [sortKey]: String(sortDir).toLowerCase() };
    }

    // 4. Pagination params
    const skipNum = skip !== undefined ? parseInt(String(skip), 10) : undefined;
    const takeNum = take !== undefined ? parseInt(String(take), 10) : undefined;

    // 5. Query data and total count concurrently
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
