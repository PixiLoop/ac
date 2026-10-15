import { Controller, Get, Post, Query, Body, Param, Delete, UseGuards } from '@nestjs/common'
import { FMCustomersService } from './fm-customers.service'
import { CreateFMCustomerDto } from './dto/create-fm-customer.dto'
import { PriceLevel } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('fm-customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FMCustomersController {
  constructor(private service: FMCustomersService) { }

  @Get('services')
  @Permissions('fmcustomers.view')
  getServices(@Query('priceLevel') priceLevel?: PriceLevel) {
    return this.service.listServices(priceLevel)
  }

  @Post()
  @Permissions('fmcustomers.create')
  create(@Body() dto: CreateFMCustomerDto) {
    return this.service.create(dto)
  }

  @Get('by-customer/:customerId')
  @Permissions('fmcustomers.view')
  getByCustomer(@Param('customerId') customerId: string) {
    return this.service.getByCustomer(customerId)
  }

  @Get()
  @Permissions('fmcustomers.view')
  async list(
    @Query('search') search?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '10',
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('customerId') customerId?: string,
    @Query() query?: Record<string, any>,
  ) {
    const safeQuery = query ?? {};
    const filters: Record<string, string> = {}

    Object.keys(safeQuery || {}).forEach(k => {
      if (k.startsWith('filter_') && safeQuery[k]) {
        filters[k.replace('filter_', '')] = safeQuery[k]
      }
    })

    // Ensure skip & take are parsed cleanly
    const skipNum = Math.max(0, parseInt(skip, 10) || 0)
    const takeNum = Math.max(1, parseInt(take, 10) || 10)

    return this.service.list({
      search,
      skip: skipNum,
      take: takeNum,
      sortKey,
      sortDir,
      filters,
      customerId,
    })
  }
  @Get('services-by-category')
  @Permissions('fmcustomers.view')
  listServicesByCategory(
    @Query('priceLevel') priceLevel: PriceLevel,
    @Query('category') category: string
  ) {
    console.log('CATEGORY RECEIVED:', category)
    return this.service.listServicesByCategory(priceLevel, category)
  }

  @Get('options')
  @Permissions('fmcustomers.view')
  async getOptions(@Query('customerId') customerId?: string) {
    return this.service.listOptions(customerId)
  }

  @Get(':id')
  @Permissions('fmcustomers.view')
  getCustomerIdByfmId(@Param('id') id: string) {
    return this.service.getCustomerIdByfmId(id)
  }

  @Delete(':id')
  @Permissions('fmcustomers.delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id)
  }

  @Post('options/:fmCustomerId')
  @Permissions('fmcustomers.edit')
  saveOptions(
    @Param('fmCustomerId') fmCustomerId: string,
    @Body() body: { options: any[] }
  ) {
    return this.service.saveOptions(fmCustomerId, body.options)
  }

}
