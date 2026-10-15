import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DispatchService } from './dispatch.service';
import { DispatchDto } from './dto/create-dispatch.dto';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('dispatch')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) { }

  @Get()
  @Permissions('dispatches.view')
  async getDispatches(@Query() query: Record<string, any>) {

    const data = await this.dispatchService.getAllDispatches(query);

    return { data };
  }

  @Get(':id')
  @Permissions('dispatches.view')
  async getDispatch(@Param('id') id: string) {

    const data = await this.dispatchService.getDispatch(id);

    return { data };
  }
  @Get('customer/:customerId')
  @Permissions('dispatches.view')
  async getLastDispatches(@Param('customerId') customerId: string) {

    const data = await this.dispatchService.getLastDispatches(customerId);

    return { data };
  }

  @Post()
  @Permissions('dispatches.create')
  async create(@Body() body: DispatchDto) {
    return this.dispatchService.createDispatch(body);
  }

  @Put(':id')
  @Permissions('dispatches.edit')
  async update(@Param('id') id: string, @Body() body: DispatchDto) {
    return this.dispatchService.updateDispatch(id, body);
  }

  @Delete(':id')
  @Permissions('dispatches.delete')
  async remove(@Param('id') id: string) {
    return this.dispatchService.deleteDispatch(id);
  }
}
