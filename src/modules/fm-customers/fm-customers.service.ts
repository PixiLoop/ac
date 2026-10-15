import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateFMCustomerDto } from './dto/create-fm-customer.dto'
import { Prisma, PriceLevel } from '@prisma/client'

@Injectable()
export class FMCustomersService {
  constructor(private prisma: PrismaService) { }

  async listServices(priceLevel?: PriceLevel) {
    const level = priceLevel ?? 'RETAIL'

    const products = await this.prisma.product.findMany({
      where: { productCategory: 'FMS' },
      orderBy: { productCode: 'asc' },
    })

    return products.map(p => ({
      id: p.id,
      productCode: p.productCode,
      defaultPrice:
        level === 'TRADE'
          ? p.tradePrice
          : level === 'SALES_PARTNER'
            ? p.salesPartnerPrice
            : level === 'AGENT'
              ? p.agentPrice
              : p.retailPrice, // default RETAIL
    }))
  }
  async create(dto: CreateFMCustomerDto) {

    return this.prisma.$transaction(async tx => {
      const orgIds = dto?.organizations ? dto.organizations?.map(item => item.id) : []
      const services = Array.isArray(dto.services) ? dto.services : []

      // CREATE / UPDATE CUSTOMER
      let fmCustomer = await tx.fMCustomer.findFirst({
        where: { customerId: dto.customerId },
      })

      if (!fmCustomer) {
        const fmWebNumber = await this.generateNextFmWebNumber(tx)

        fmCustomer = await tx.fMCustomer.create({
          data: {
            customerId: dto.customerId,
            priceLevel: dto.priceLevel,
            priceFactor: dto.priceFactor,
            depots: dto.depots,
            invPeriod: dto.invPeriod,
            volOffset: dto.volOffset,
            invoiceBy: dto.invoiceBy,
            sortBy: dto.sortBy,
            listBy: dto.listBy,
            fmWebNumber,
            fleetName: dto.fleetName,
            mixOrgId: dto.mixOrgId,
            mixDBase: dto.mixDBase,
          },
        })

        await tx.customer.update({
          where: { id: dto.customerId },
          data: { fmCustomerNumber: fmWebNumber },
        })

      } else {
        await tx.fMCustomer.update({
          where: { id: fmCustomer.id },
          data: {
            priceLevel: dto.priceLevel,
            priceFactor: dto.priceFactor,
            depots: dto.depots,
            invPeriod: dto.invPeriod,
            volOffset: dto.volOffset,
            invoiceBy: dto.invoiceBy,
            sortBy: dto.sortBy,
            listBy: dto.listBy,
            fleetName: dto.fleetName,
            mixOrgId: dto.mixOrgId,
            mixDBase: dto.mixDBase,
          },
        })

        //CLEAR BOTH TABLES (IMPORTANT)
        await tx.fMCustomerService.deleteMany({
          where: { fmCustomerId: fmCustomer.id },
        })

        await tx.fMCustomerServiceItem.deleteMany({
          where: { fmCustomerId: fmCustomer.id },
        })

        await tx.customer.update({
          where: { id: dto.customerId },
          data: { fmCustomerNumber: fmCustomer.fmWebNumber },
        })
      }

      // REMOVE DUPLICATES
      const uniqueMap = new Map<string, any>()
      for (const s of services) {
        uniqueMap.set(s.productId, s)
      }
      const uniqueServices = Array.from(uniqueMap.values())

      await tx.fMCustomerOrgIds.deleteMany({
        where: {
          fmId: fmCustomer.id,
          orgId: {
            notIn: orgIds
          }
        }
      })

      for (const element of orgIds) {
        const id = await tx.fMCustomerOrgIds.findFirst({
          where: {
            fmId: fmCustomer.id,
            orgId: element
          }
        })
        if (id) {
          continue;
        }
        await tx.fMCustomerOrgIds.create({
          data: {
            fmId: fmCustomer.id,
            orgId: element
          }
        })
      }
      // INSERT SERVICES
      for (const s of uniqueServices) {
        if (
          (s.numItems ?? 0) === 0 &&
          (s.price ?? 0) === 0 &&
          (s.active ?? 0) === 0 &&
          (s.charge ?? 0) === 0 &&
          (s.monthlyCharge ?? 0) === 0
        ) {
          continue
        }

        const product = await tx.product.findUnique({
          where: { id: s.productId },
          select: { productCategory: true }
        })

        // FMS + DRIVER_OPTIONS
        if (product && ['FMS', 'DRIVER_OPTIONS'].includes(product.productCategory)) {

          await tx.fMCustomerService.create({
            data: {
              fmCustomerId: fmCustomer.id,
              productId: s.productId,
              numItems: s.numItems,
              price: s.price,
              active: s.active ?? 0,
              charge: s.charge ?? 0,
              monthlyCharge: s.monthlyCharge ?? 0
            }
          })

          continue
        }

        // CAMERA / SIM / MIX
        await tx.fMCustomerServiceItem.upsert({
          where: {
            fmCustomerId_serviceId: {
              fmCustomerId: fmCustomer.id,
              serviceId: s.productId
            }
          },
          update: {
            numItems: s.numItems,
            active: s.active ?? 0,
            price: s.price ?? 0,
            monthlyCharge: s.monthlyCharge ?? 0
          },
          create: {
            fmCustomerId: fmCustomer.id,
            serviceId: s.productId,
            numItems: s.numItems,
            active: s.active ?? 0,
            price: s.price ?? 0,
            monthlyCharge: s.monthlyCharge ?? 0
          }
        })
      }

      // OPTIONS
      const options = Array.isArray(dto.options) ? dto.options : []

      await tx.fMCustomerOption.deleteMany({
        where: { fmCustomerId: fmCustomer.id }
      })

      for (const opt of options) {
        if (!opt.enabled) continue

        await tx.fMCustomerOption.create({
          data: {
            fmCustomerId: fmCustomer.id,
            optionId: opt.optionId,
            enabled: opt.enabled,
            charge: opt.charge ?? 0,
            vehicleCount: opt.vehicleCount ?? 0
          }
        })
      }

      return fmCustomer
    })
  }

  async getByCustomer(customerId: string) {
    return this.prisma.fMCustomer.findFirst({
      where: { customerId },
      select: { id: true }
    })
  }

  async list({
    skip,
    take,
    search,
    sortKey = 'createdAt',
    sortDir = 'desc',
    filters = {},
    customerId,
  }: {
    skip: number
    take: number
    search?: string
    sortKey?: string
    sortDir?: 'asc' | 'desc'
    filters?: Record<string, string>
    customerId?: string
  }) {
    const AND: Prisma.FMCustomerWhereInput[] = []

    if (customerId) {
      AND.push({ customerId })
    }

    /* ===== SEARCH ===== */
    if (search?.trim()) {
      const term = search.trim()
      AND.push({
        OR: [
          { fmWebNumber: { contains: term, mode: 'insensitive' } },
          { fleetName: { contains: term, mode: 'insensitive' } },
          {
            customer: {
              is: {
                name: { contains: term, mode: 'insensitive' },
              },
            },
          },
          {
            customer: {
              is: {
                customerNumber: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      })
    }
    /* ===== COLUMN FILTERS ===== */
    if (filters.fmWebNumber) {
      AND.push({
        fmWebNumber: { in: filters.fmWebNumber.split(',') },
      })
    }

    if (filters.fleetName) {
      AND.push({
        fleetName: { in: filters.fleetName.split(',') },
      })
    }

    if (filters.priceLevel) {
      AND.push({
        priceLevel: {
          in: filters.priceLevel.split(',') as PriceLevel[],
        },
      })
    }

    if (filters.customerName) {
      AND.push({
        customer: {
          is: {
            name: { in: filters.customerName.split(',') },
          },
        },
      })
    }

    if (filters.customerNumber) {
      AND.push({
        customer: {
          is: {
            customerNumber: {
              in: filters.customerNumber.split(','),
            },
          },
        },
      })
    }

    const where: Prisma.FMCustomerWhereInput =
      AND.length > 0 ? { AND } : {}

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fMCustomer.findMany({
        where,
        skip,
        take,
        orderBy:
          sortKey === 'customerName'
            ? { customer: { name: sortDir } }
            : sortKey === 'customerNumber'
              ? { customer: { customerNumber: sortDir } }
              : { [sortKey]: sortDir },
        include: {
          customer: {
            select: { name: true, customerNumber: true },
          },
        },
      }),
      this.prisma.fMCustomer.count({ where }),
    ])

    return { items, total }
  }

  async getCustomerIdByfmId(id: string) {
    return this.prisma.fMCustomer.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            product: {
              select: {
                id: true,
                productCode: true,
                productCategory: true
              },
            },
          },
        },
        cameraSimMixServices: {
          include: {
            service: true
          }
        },
        FMCustomerOrgIds: {
          include: {
            organizations: true
          }
        }
      },
    })
  }

  async generateNextFmWebNumber(tx: Prisma.TransactionClient) {
    const last = await tx.fMCustomer.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { fmWebNumber: true },
    })

    if (!last?.fmWebNumber) {
      return 'FM-0001'
    }
    const match = last.fmWebNumber.match(/FM-(\d+)/)
    const lastNum = match ? Number(match[1]) : 0
    const nextNum = lastNum + 1
    return `FM-${String(nextNum).padStart(4, '0')}`
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.fMCustomer.findUnique({
        where: { id },
      })
      if (!existing) {
        throw new Error('FM Customer not found')
      }

      // Delete all child records first (order matters due to FK constraints)
      await tx.fMCustomerService.deleteMany({
        where: { fmCustomerId: id },
      })
      await tx.fMCustomerServiceItem.deleteMany({
        where: { fmCustomerId: id },
      })
      // ← ADD THIS — was missing, causing the FK RESTRICT violation
      await tx.fMCustomerOption.deleteMany({
        where: { fmCustomerId: id },
      })

      // Now safe to delete the parent
      await tx.fMCustomer.delete({
        where: { id },
      })

      return { success: true }
    })
  }

  /*async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.fMCustomer.findUnique({
        where: { id },
      })
      if (!existing) {
        throw new Error('FM Customer not found')
      }
      // Delete child services first
      await tx.fMCustomerService.deleteMany({
        where: { fmCustomerId: id },
      })
      await tx.fMCustomerServiceItem.deleteMany({
        where: { fmCustomerId: id },
      })
      // Delete FM customer
      await tx.fMCustomer.delete({
        where: { id },
      })
      return { success: true }
    })
  }*/

  async listServicesByCategory(
    priceLevel?: PriceLevel,
    category?: string
  ) {

    // FM SERVICES from Product table
    if (category === 'FMS' || category === 'DRIVER_OPTIONS') {

      const products = await this.prisma.product.findMany({
        where: { productCategory: category },
        orderBy: { productCode: 'asc' }
      })

      const data = products.map(p => ({
        id: p.id,
        productCode: p.productCode,
        defaultPrice:
          priceLevel === 'TRADE'
            ? p.tradePrice
            : priceLevel === 'SALES_PARTNER'
              ? p.salesPartnerPrice
              : priceLevel === 'AGENT'
                ? p.agentPrice
                : p.retailPrice
      }))

      return { status: true, data }
    }

    // CAMERA / SIMTYPE / MIX → from FMServiceMaster
    const services = await this.prisma.fMServiceMaster.findMany({
      where: {
        type: category as any,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    return {
      status: true,
      data: services.map(s => ({
        id: s.id,
        productCode: s.label,
        defaultPrice: 0
      }))
    }
  }

  async listOptions(customerId?: string) {
    let fmCustomerId: string | undefined
    if (customerId) {
      const fm = await this.prisma.fMCustomer.findFirst({
        where: { customerId },
        select: { id: true }
      })

      fmCustomerId = fm?.id
    }

    const options = await this.prisma.fMOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        customerOptions: fmCustomerId
          ? { where: { fmCustomerId } }
          : false,
      },
    })

    return {
      status: true,
      data: options.map(o => ({
        id: o.id,
        label: o.label,
        enabled: o.customerOptions?.[0]?.enabled ?? false,
        charge: o.customerOptions?.[0]?.charge ?? 0,
        vehicleCount: o.customerOptions?.[0]?.vehicleCount ?? 0,
      }))
    }
  }


  async saveOptions(fmCustomerId: string, options: any[]) {

    await this.prisma.fMCustomerOption.deleteMany({
      where: { fmCustomerId }
    })

    for (const opt of options) {
      await this.prisma.fMCustomerOption.create({
        data: {
          fmCustomerId,
          optionId: opt.optionId,
          enabled: opt.enabled,
          charge: opt.charge ?? 0,
          vehicleCount: opt.vehicleCount ?? 0
        }
      })
    }

    return { success: true }
  }

  async getOptions() {

    const master = await this.prisma.fMOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return {
      status: true,
      data: master.map(opt => ({
        id: opt.id,
        label: opt.label,
        enabled: false,
        charge: 0,
        vehicleCount: 0
      }))
    }
  }

}
