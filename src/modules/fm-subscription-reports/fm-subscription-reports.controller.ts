import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FMSubscriptionReportsService } from './fm-subscription-reports.service';
import { CreateSubscriptionReportDto } from './dto/create-subscription-report.dto';
import { UpdateSubscriptionReportDto } from './dto/update-subscription-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';

@Controller('fm-subscription-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FMSubscriptionReportsController {
  constructor(private readonly service: FMSubscriptionReportsService) { }

  @Get()
  @Permissions('fmcustomers.view')
  list(@Query() q?: string) {
    return this.service.list(q);
  }

  @Get('check-prepaid')
  @Permissions('fmcustomers.view')
  checkPrepaid() {
    return this.service.checkPrepaid();
  }

  @Get(':id')
  @Permissions('fmcustomers.view')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/preview')
  @Permissions('fmcustomers.view')
  preview(@Param('id') id: string) {
    return this.service.preview(id);
  }

  @Post()
  @Permissions('fmcustomers.edit')
  create(@Body() dto: CreateSubscriptionReportDto) {
    return this.service.create(dto);
  }

  @Post(':id/generate')
  @Permissions('fmcustomers.edit')
  generate(@Param('id') id: string) {
    return this.service.generate(id);
  }

  @Post('generate-all-eligible')
  @Permissions('fmcustomers.edit')
  generateAllEligible() {
    return this.service.generateAllEligible();
  }

  @Patch(':id')
  @Permissions('fmcustomers.edit')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionReportDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('fmcustomers.delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}