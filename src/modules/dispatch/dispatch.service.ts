import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DispatchDto } from './dto/create-dispatch.dto';

type ListAssignedParams = {
  userId: string;
  skip?: number;
  take?: number;
  status?: string;
  search?: string;
};

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private prisma: PrismaService) { }

  private async generateDispatchNumber(): Promise<string> {
    const last = await this.prisma.dispatch.findFirst({
      where: { dispatchNumber: { startsWith: 'DISP' + '-' } },
      orderBy: { dispatchNumber: 'desc' },
      select: { dispatchNumber: true },
    });

    if (!last) return `DISP-1000`;
    const match = last.dispatchNumber.match(new RegExp(`DISP-(\\d+)`));
    const num = match ? parseInt(match[1], 10) : 1000 - 1;
    return `DISP-${num + 1}`;
  }

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
  async getDispatch(id: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: {
        id: id
      },
      include: {
        DispatchedInvoices: {
          include: {
            Invoice: {
              include: {
                items: true
              }
            },
            DispatchMethod: true,
            User: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        Customer: {
          select: {
            customerNumber: true
          }
        },
      }
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');
    return {
      ...dispatch, DispatchedInvoices: dispatch.DispatchedInvoices.map(di => ({
        ...di,
        Invoice: {
          id: di.Invoice.id,
          invoiceNumber: di.Invoice.invoiceNumber,
          createdAt: di.Invoice.createdAt,
          items: di.Invoice.items
        }
      }))
    };
  }
  async getLastDispatches(customerId: string) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        customerId: customerId
      },
      include: {
        DispatchedInvoices: {
          include: {
            Invoice: true,
            DispatchMethod: true
          }
        }
      }
    });
    return dispatches.map(item => ({
      ...item, DispatchedInvoices: item.DispatchedInvoices.map(di => ({
        ...di,
        Invoice: {
          id: di.Invoice.id,
          invoiceNumber: di.Invoice.invoiceNumber
        }
      }))
    }));
  }

  async createDispatch(body: DispatchDto) {
    const { conNote,
      customerId,
      dispatchDate,
      dispatchMethod,
      freightCharge,
      freightCost,
      invoices,
      shippingAddress } = body;

    const dispatch = await this.prisma.dispatch.create({
      data: {
        conNote,
        dispatchNumber: await this.generateDispatchNumber(),
        dispatchDate: new Date(dispatchDate),
        customerId,
        dispatchMethod,
        freightCharge,
        freightCost,
        shippingAddress,
        DispatchedInvoices: {
          createMany: {
            data: invoices.map(item => ({
              invoiceId: item.id,
              dispatchCode: item.dispatchCode,
              salesPersonId: item.salesPersonId || undefined
            }))
          }
        }
      },
      include: {
        DispatchedInvoices: true
      }
    })
    return dispatch;
  }

  async updateDispatch(id: string, body: DispatchDto) {
    const existing = await this.prisma.dispatch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Dispatch not found');
    }

    const {
      conNote,
      customerId,
      dispatchDate,
      dispatchMethod,
      freightCharge,
      freightCost,
      invoices,
      shippingAddress,
    } = body;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Remove existing dispatched invoice relations for this dispatch
      await tx.dispatchedInvoices.deleteMany({
        where: { dispatchId: id },
      });

      // 2. Update dispatch record and recreate dispatched invoices
      const updatedDispatch = await tx.dispatch.update({
        where: { id },
        data: {
          conNote,
          dispatchDate: new Date(dispatchDate),
          customerId,
          dispatchMethod,
          freightCharge,
          freightCost,
          shippingAddress,
          DispatchedInvoices: {
            createMany: {
              data: invoices.map((item) => ({
                invoiceId: item.id,
                dispatchCode: item.dispatchCode,
                salesPersonId: item.salesPersonId || undefined,
              })),
            },
          },
        },
        include: {
          DispatchedInvoices: true,
        },
      });

      return updatedDispatch;
    });
  }

  async deleteDispatch(id: string) {
    const existing = await this.prisma.dispatch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Dispatch not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete associated DispatchedInvoice records
      await tx.dispatchedInvoices.deleteMany({
        where: { dispatchId: id },
      });

      // 2. Delete the parent Dispatch record
      const deletedDispatch = await tx.dispatch.delete({
        where: { id },
      });

      return {
        message: 'Dispatch deleted successfully',
        id: deletedDispatch.id,
      };
    });
  }
}
