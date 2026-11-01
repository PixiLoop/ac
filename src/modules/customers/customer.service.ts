import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CustomerRules } from './validators/customer.rules'
import {
  UpdateCustomerAddressesDto,
  CustomerAddressDto,
} from './dto/update-customer-addresses.dto'
import { UpdateCustomerContactsDto } from './dto/update-customer-contacts.dto'
import { UpdateCustomerPaymentDto } from './dto/update-customer-payment.dto'
import { UpdateCustomerDepotsDto, UpdateCustomerDispatchesDto } from './dto/update-customer-dispatches.dto'
import { UpdateCustomerAccountDto } from './dto/update-customer-account.dto'
import { Prisma, CustomerStatus, AddressType } from '@prisma/client';


const PAYMENT_FIELDS = [
  'accountType',
  'parentCustomerId',
  'paymentTerms',
  'priceLevel',
  'salesFactor',
  'gstExempt',
  'paymentMethod',
  'invoiceDelivery',
  'bankAccountName',
  'bankAccountNo',
  'bankBsb',
  'bankName',
] as const

function sanitizeUpdate<T extends Record<string, any>>(
  dto: T,
  allowed: readonly string[],
) {
  const out: Record<string, any> = {}

  for (const key of allowed) {
    if (!(key in dto)) continue
    const value = dto[key]
    out[key] = value === '' ? null : value
  }

  return out
}

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) { }

  /* =========================
     CREATE / GET
  ========================= */

  async create(dto: any) {
    CustomerRules.validateCreate(dto)

    const customerNumber = dto.customerNumber?.trim()
      ? dto.customerNumber.trim()
      : await this.generateCustomerNumber()

    return this.prisma.customer.create({
      data: {
        ...dto,
        customerNumber,
        status: dto.status ?? 'ACTIVE',
      },
    })
  }

  private async generateCustomerNumber(): Promise<string> {
    const prefix = 'CUS'
    const startNum = 1001

    const last = await this.prisma.customer.findFirst({
      where: { customerNumber: { startsWith: prefix + '-' } },
      orderBy: { customerNumber: 'desc' },
      select: { customerNumber: true },
    })

    if (!last) return `${prefix}-${startNum}`
    const match = last.customerNumber.match(new RegExp(`${prefix}-(\\d+)`))
    const num = match ? parseInt(match[1], 10) : startNum - 1
    return `${prefix}-${num + 1}`
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: { where: { deletedAt: null } },
        addresses: { where: { deletedAt: null } },
        dispatches: { where: { deletedAt: null } },
        Depots: { where: { deletedAt: null } },
        fmCustomer: {
          select: {
            id: true,
            fmWebNumber: true,
            priceLevel: true,
            priceFactor: true,
            FMCustomerOrgIds: {
              select: {
                organizations: true
              }
            }
          },
        },
        parentCustomer: {
          select: {
            id: true,
            customerNumber: true,
            name: true,
            registeredName: true,
            accountType: true,
          },
        },
        childAccounts: {
          where: { deletedAt: null },
          select: {
            id: true,
            customerNumber: true,
            name: true,
            accountType: true,
          },
          orderBy: { name: 'asc' },
        },

        invoices: {
          where: {
            OR: [
              { status: 'ISSUED' },
              { status: 'PARTIALLY_PAID' }
            ]
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            salesOrder: { select: { id: true, orderNumber: true } },
            dispatch: { select: { id: true, method: true, accountNo: true, accountName: true } },
            items: { where: { deletedAt: null } },
            DispatchedInvoices: true
          }
        }
      },
    })
    console.log("customer==", customer)
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  /* =========================
     UPDATE CORE
  ========================= */

  async updateDetails(id: string, dto: any) {
    await this.getById(id)
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    })
  }

  async updateAccount(id: string, dto: UpdateCustomerAccountDto) {
    const customer = await this.getById(id)

    CustomerRules.validateAccountUpdate(
      dto.creditLimit,
      dto.creditHold,
      dto.creditHoldReason,
      customer.currentBalance?.toNumber?.(),
    )

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        creditHoldReason: dto.creditHold ? dto.creditHoldReason : null,
      },
    })
  }

  async updatePayment(id: string, dto: UpdateCustomerPaymentDto) {
    const customer = await this.getById(id)

    CustomerRules.validatePaymentUpdate(
      dto.paymentTerms,
      dto.priceLevel,
      dto.gstExempt,
    )

    const data = sanitizeUpdate(dto, PAYMENT_FIELDS)
    const nextType = String(
      'accountType' in dto ? (data.accountType ?? '') : (customer.accountType ?? ''),
    )
    const isMain = /^main$/i.test(nextType)
    const isDepot = /^depot$/i.test(nextType)

    if (!isMain) {
      const linked = await this.prisma.customer.count({
        where: { parentCustomerId: id, deletedAt: null },
      })
      if (linked > 0) {
        throw new BadRequestException('This account is the main account for depot accounts')
      }
    }

    if (isDepot) {
      const parentId = 'parentCustomerId' in dto
        ? data.parentCustomerId
        : customer.parentCustomerId
      if (!parentId || parentId === id) {
        throw new BadRequestException('Main Account is required')
      }
      const parent = await this.prisma.customer.findFirst({
        where: { id: parentId, deletedAt: null },
        select: { id: true, accountType: true },
      })
      if (!parent || !/^main$/i.test(parent.accountType ?? '')) {
        throw new BadRequestException('Main Account is required')
      }
      data.parentCustomerId = parent.id
    } else if ('accountType' in dto) {
      data.parentCustomerId = null
    }

    return this.prisma.customer.update({
      where: { id },
      data,
    })
  }

  /* =========================
     CONTACTS
  ========================= */

  async updateContacts(customerId: string, dto: UpdateCustomerContactsDto) {
    await this.getById(customerId)
    CustomerRules.validateContacts(dto.contacts)

    const existing = await this.prisma.customerContact.findMany({
      where: { customerId, deletedAt: null },
    })

    const incomingIds = dto.contacts.filter(c => c.id).map(c => c.id)
    const toDelete = existing.filter(c => !incomingIds.includes(c.id)).map(c => c.id)

    await this.prisma.customerContact.updateMany({
      where: { id: { in: toDelete } },
      data: { deletedAt: new Date() },
    })

    let primaryIndex = dto.contacts.findIndex(c => c.isPrimary)
    if (primaryIndex === -1 && dto.contacts.length) primaryIndex = 0

    for (let i = 0; i < dto.contacts.length; i++) {
      const c = dto.contacts[i]
      await this.prisma.customerContact.upsert({
        where: { id: c.id ?? '' },
        update: { ...c, isPrimary: i === primaryIndex },
        create: { ...c, customerId, isPrimary: i === primaryIndex },
      })
    }

    return this.getById(customerId)
  }

  async updateAddresses(customerId: string, dto: UpdateCustomerAddressesDto) {
    await this.getById(customerId);
    CustomerRules.validateAddresses(dto.addresses);

    /* 1️⃣ Soft delete removed */
    const existing = await this.prisma.customerAddress.findMany({
      where: { customerId, deletedAt: null },
    });

    const incomingIds = dto.addresses
      .filter(a => a.id)
      .map(a => a.id);

    const toDelete = existing
      .filter(a => !incomingIds.includes(a.id))
      .map(a => a.id);

    if (toDelete.length) {
      await this.prisma.customerAddress.updateMany({
        where: { id: { in: toDelete } },
        data: { deletedAt: new Date() },
      });
    }

    // One default per address type (Shipping + Charge can both be default)
    const claimedDefaultTypes = new Set<string>();
    const normalized = dto.addresses.map(a => {
      const type = a.type ?? 'SHIPPING';
      let isDefault = !!a.isDefault;
      if (isDefault) {
        if (claimedDefaultTypes.has(type)) isDefault = false;
        else claimedDefaultTypes.add(type);
      }
      return { ...a, type, isDefault };
    });

    await this.prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    for (const a of normalized) {
      const { id, ...rest } = a as any;
      if (id) {
        await this.prisma.customerAddress.update({
          where: { id },
          data: {
            ...rest,
            isDefault: !!a.isDefault,
          },
        });
      } else {
        await this.prisma.customerAddress.create({
          data: {
            ...rest,
            customerId,
            isDefault: !!a.isDefault,
          },
        });
      }
    }

    return this.getById(customerId);
  }


  //Process each TYPE separately Only 1 default per TYPE
  //  async updateAddresses(customerId: string, dto: UpdateCustomerAddressesDto) {
  //   await this.getById(customerId);
  //   CustomerRules.validateAddresses(dto.addresses); 
  //   //delete
  //   const existing = await this.prisma.customerAddress.findMany({
  //     where: { customerId, deletedAt: null },
  //   });

  //   const incomingIds = dto.addresses
  //     .filter(a => a.id)
  //     .map(a => a.id);

  //   const toDelete = existing
  //     .filter(a => !incomingIds.includes(a.id))
  //     .map(a => a.id);

  //   if (toDelete.length) {
  //     await this.prisma.customerAddress.updateMany({
  //       where: { id: { in: toDelete } },
  //       data: { deletedAt: new Date() },
  //     });
  //   } 
  //   const byType: Record<string, typeof dto.addresses> = {};

  //   dto.addresses.forEach(a => {
  //     if (!byType[a.type]) {
  //       byType[a.type] = [];
  //     }
  //     byType[a.type].push(a);
  //   });

  //   for (const type of Object.keys(byType) as AddressType[]) {
  //     const list = byType[type];
  //     let defaultIndex = list.findIndex(a => a.isDefault === true);

  //     await this.prisma.customerAddress.updateMany({
  //       where: {
  //         customerId,
  //         type,
  //         deletedAt: null,
  //       },
  //       data: {
  //         isDefault: false,
  //       },
  //     }); 
  //     for (let i = 0; i < list.length; i++) {
  //       const a = list[i];

  //       await this.prisma.customerAddress.upsert({
  //         where: {
  //           id: a.id ?? '__new__',
  //         },
  //         update: {
  //           ...a,
  //           isDefault: i === defaultIndex,
  //         },
  //         create: {
  //           ...a,
  //           customerId,
  //           isDefault: i === defaultIndex,
  //         },
  //       });
  //     }
  //   }
  //   return this.getById(customerId);
  // }


  // async updateAddresses(customerId: string, dto: UpdateCustomerAddressesDto) {
  //   await this.getById(customerId)
  //   CustomerRules.validateAddresses(dto.addresses)

  //   const existing = await this.prisma.customerAddress.findMany({
  //     where: { customerId, deletedAt: null },
  //   })

  //   const incomingIds = dto.addresses.filter(a => a.id).map(a => a.id)
  //   const toDelete = existing.filter(a => !incomingIds.includes(a.id)).map(a => a.id)

  //   await this.prisma.customerAddress.updateMany({
  //     where: { id: { in: toDelete } },
  //     data: { deletedAt: new Date() },
  //   })

  //   const byType: Record<string, CustomerAddressDto[]> = {}
  //   dto.addresses.forEach(a => {
  //     byType[a.type] = byType[a.type] || []
  //     byType[a.type].push(a)
  //   })

  //   for (const type of Object.keys(byType)) {
  //     const list = byType[type]
  //     let defaultIndex = list.findIndex(a => a.isDefault)
  //     if (defaultIndex === -1 && list.length) defaultIndex = 0

  //     for (let i = 0; i < list.length; i++) {
  //       const a = list[i]
  //       await this.prisma.customerAddress.upsert({
  //         where: { id: a.id ?? '' },
  //         update: { ...a, isDefault: i === defaultIndex },
  //         create: { ...a, customerId, isDefault: i === defaultIndex },
  //       })
  //     }
  //   }

  //   return this.getById(customerId)
  // }

  /* =========================
     DISPATCHES
  ========================= */

  async updateDispatches(customerId: string, dto: UpdateCustomerDispatchesDto) {
    if (!dto || !Array.isArray(dto.dispatches)) {
      throw new Error('dispatches must be an array')
    }

    await this.getById(customerId)

    const existing = await this.prisma.customerDispatch.findMany({
      where: { customerId, deletedAt: null },
    })

    const incomingIds = dto.dispatches
      .filter(d => d.id)
      .map(d => d.id)

    const toDelete = existing
      .filter(d => !incomingIds.includes(d.id))
      .map(d => d.id)

    await this.prisma.customerDispatch.updateMany({
      where: { id: { in: toDelete } },
      data: { deletedAt: new Date() },
    })

    let defaultIndex = dto.dispatches.findIndex(d => d.isDefault)
    if (defaultIndex === -1 && dto.dispatches.length) defaultIndex = 0

    for (let i = 0; i < dto.dispatches.length; i++) {
      const { __mode, createdAt, updatedAt, deletedAt, ...d } =
        dto.dispatches[i] as any

      await this.prisma.customerDispatch.upsert({
        where: {
          id: d.id ?? '__new__',
        },
        update: {
          method: d.method,
          accountNo: d.accountNo ?? null,
          accountName: d.accountName ?? null,
          charge: d.charge ?? null,
          reference: d.reference ?? null,
          isDefault: i === defaultIndex,
        },
        create: {
          customerId,
          method: d.method,
          accountNo: d.accountNo ?? null,
          accountName: d.accountName ?? null,
          charge: d.charge ?? null,
          reference: d.reference ?? null,
          isDefault: i === defaultIndex,
        },
      })
    }


    return this.getById(customerId)
  }

  /* =========================
     DEPOTS
  ========================= */

  async updateDepots(customerId: string, dto: UpdateCustomerDepotsDto) {
    if (!dto || !Array.isArray(dto.depots)) {
      throw new Error('depots must be an array')
    }

    await this.getById(customerId)

    const existing = await this.prisma.depots.findMany({
      where: { customerId },
    })

    const incomingIds = dto.depots
      .filter(d => d.id)
      .map(d => d.id)

    const toDelete = existing
      .filter(d => !incomingIds.includes(d.id))
      .map(d => d.id)

    await this.prisma.depots.updateMany({
      where: { id: { in: toDelete } },
      data: { deletedAt: new Date() },
    })


    for (let i = 0; i < dto.depots.length; i++) {
      const d =
        dto.depots[i]

      await this.prisma.depots.upsert({
        where: {
          id: d.id ?? '__new__',
        },
        update: {
          code: d.code,
          name: d.name,
        },
        create: {
          customerId,
          code: d.code,
          name: d.name,
          createdAt: new Date(),
        },
      })
    }


    return this.getById(customerId)
  }

  async findByNumber(customerNumber: string) {
    const number = customerNumber.trim()
    if (!number) throw new NotFoundException('Invalid Customer Number')

    const customer = await this.prisma.customer.findFirst({
      where: {
        deletedAt: null,
        customerNumber: { equals: number, mode: 'insensitive' },
      },
      include: {
        fmCustomer: {
          select: { id: true, fleetName: true, fmWebNumber: true },
        },
      },
    })
    if (!customer) throw new NotFoundException('Invalid Customer Number')
    return customer
  }


  //List API
  async list(params: {
    search?: string;
    skip: number;
    take: number;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    filters?: Record<string, string>;
    accountType?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
    };

    if (params.accountType?.trim()) {
      where.accountType = {
        equals: params.accountType.trim(),
        mode: 'insensitive',
      };
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { customerNumber: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { registeredName: { contains: term, mode: 'insensitive' } },
        { abn: { contains: term, mode: 'insensitive' } },
        { fmCustomerNumber: { contains: term, mode: 'insensitive' } },
        { fmCustomer: { fleetName: { contains: term, mode: 'insensitive' } } },
        { fmCustomer: { fmWebNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (params.filters?.customerNumber) {
      where.customerNumber = {
        in: params.filters.customerNumber.split(','),
      };
    }


    if (params.filters) {
      if (params.filters.status) {
        where.status = {
          in: params.filters.status.split(',') as CustomerStatus[],
        };
      }


      if (params.filters.name) {
        where.name = {
          in: params.filters.name.split(','),
        };
      }

      if (params.filters.registeredName) {
        where.registeredName = {
          in: params.filters.registeredName.split(','),
        };
      }

      if (params.filters.abn) {
        where.abn = {
          in: params.filters.abn.split(','),
        };
      }

      if (params.filters.fmCustomerNumber) {
        where.fmCustomerNumber = {
          in: params.filters.fmCustomerNumber.split(','),
        };
      }

      if (params.filters.isGeneric) {
        where.isGeneric = params.filters.isGeneric === 'true';
      }

      if (params.filters.createdAt) {
        const dates = params.filters.createdAt.split(',');

        const existingAnd: Prisma.CustomerWhereInput[] = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];

        where.AND = [
          ...existingAnd,
          {
            OR: dates.map(d => {
              const start = new Date(d);
              const end = new Date(d);
              end.setDate(end.getDate() + 1);
              return {
                createdAt: {
                  gte: start,
                  lt: end,
                },
              };
            }),
          },
        ];
      }
    }

    /* ================= SORT ================= */
    const sortMap: Record<string, keyof Prisma.CustomerOrderByWithRelationInput> = {
      customerNumber: 'customerNumber',
      name: 'name',
      registeredName: 'registeredName',
      abn: 'abn',
      fmCustomerNumber: 'fmCustomerNumber',
      status: 'status',
      createdAt: 'createdAt',
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      params.sortKey && sortMap[params.sortKey]
        ? {
          [sortMap[params.sortKey]]:
            (params.sortDir ?? 'asc') as Prisma.SortOrder,
        }
        : {
          createdAt: 'desc',
        };

    /* ================= QUERY ================= */
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          fmCustomer: {
            select: { id: true, fleetName: true, fmWebNumber: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total };
  }




  async getIndicators(id: string) {
    const c = await this.getById(id)
    return {
      currentBalance: c.currentBalance,
      overdueAmount: c.overdueAmount,
      creditLimit: c.creditLimit,
      creditHold: c.creditHold,
      status: c.status,
    }
  }

  async delete(id: string) {
    const now = new Date();

    await this.getById(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.customerContact.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.customerAddress.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.customerDispatch.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.customer.update({
        where: { id },
        data: { deletedAt: now },
      });

      return { success: true };
    });
  }

}
