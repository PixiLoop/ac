import { Controller, Post, Get, Patch, Param, Body, Query, Delete, UseGuards } from '@nestjs/common'
import { CustomerService } from './customer.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController {
  constructor(private readonly service: CustomerService) { }

  @Get()
  @Permissions('customers.view')
  async list(
    @Query('search') search?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '10',
    @Query('sortKey') sortKey?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query() query?: Record<string, any>,
  ) {
    const filters: Record<string, string> = {};

    Object.keys(query || {}).forEach((k) => {
      if (k.startsWith('filter_') && query[k]) {
        filters[k.replace('filter_', '')] = query[k];
      }
    });

    return this.service.list({
      search,
      skip: Number(skip),
      take: Number(take),
      sortKey,
      sortDir,
      filters,
    });
  }


  @Post()
  @Permissions('customers.create')
  create(@Body() body: any) {
    return this.service.create(body)
  }

  @Get(':id')
  @Permissions('customers.view')
  getById(@Param('id') id: string) {
    return this.service.getById(id)
  }

  @Patch(':id/details')
  @Permissions('customers.edit')
  updateDetails(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDetails(id, body)
  }

  @Patch(':id/account')
  @Permissions('customers.edit')
  updateAccount(@Param('id') id: string, @Body() body: any) {
    return this.service.updateAccount(id, body)
  }

  @Patch(':id/contacts')
  @Permissions('customers.edit')
  updateContacts(@Param('id') id: string, @Body() body: any) {
    return this.service.updateContacts(id, body)
  }

  @Patch(':id/addresses')
  @Permissions('customers.edit')
  updateAddresses(@Param('id') id: string, @Body() body: any) {
    return this.service.updateAddresses(id, body)
  }

  @Patch(':id/payment')
  @Permissions('customers.edit')
  updatePayment(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePayment(id, body)
  }

  @Patch(':id/dispatches')
  @Permissions('customers.edit')
  updateDispatches(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDispatches(id, body)
  }
  @Patch(':id/depots')
  @Permissions('customers.edit')
  updateDepots(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDepots(id, body)
  }

  @Get(':id/indicators')
  @Permissions('customers.view')
  indicators(@Param('id') id: string) {
    return this.service.getIndicators(id)
  }

  @Delete(':id')
  @Permissions('customers.delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
