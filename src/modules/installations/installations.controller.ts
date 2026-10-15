import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { InstallationsService } from './installations.service';

@Controller('installations')
@UseGuards(JwtAuthGuard)
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) { }

  @Get()
  @Permissions('dispatches.view')
  async getDispatches(@Query() query: Record<string, any>) {

    const data = await this.installationsService.getAllDispatches(query);

    return { data };
  }
}
