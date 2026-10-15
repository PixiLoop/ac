import { Controller, Get, Patch, Body, UseGuards  } from '@nestjs/common';
import { GroupsService } from './groups.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';
import { Permissions } from '../../../common/rbac/permissions.decorator';

@Controller('inventory/groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get('airco')
  @Permissions('inventory.view')
  getAircoGroups() {
    return this.service.getAircoGroups(); 
  }

  @Patch('airco')
  @Permissions('inventory.edit')
  bulkUpdateAircoGroups(
    @Body() body: { rows: { code: string; agentFactor: number; partnerFactor: number }[] },
  ) {
    return this.service.bulkUpdateAircoGroups(body.rows);
  }

  @Get('variable')
  @Permissions('inventory.view')
  getVariableTiers() {
    return this.service.getVariableTiers();
  }

  @Patch('variable')
  @Permissions('inventory.edit')
  bulkUpdateVariableTiers(
    @Body() body: {
      rows: {
        id: string;
        kRetailFactor: number; kTradeFactor: number; kThreshold: number;
        aRetailFactor: number; aTradeFactor: number; aThreshold: number;
      }[];
    },
  ) {
    return this.service.bulkUpdateVariableTiers(body.rows);
  }

  @Get('x')
  @Permissions('inventory.view')
  getXGroups() {
    return this.service.getXGroups();
  }

  @Patch('x')
  @Permissions('inventory.edit')
  bulkUpdateXGroups(
    @Body() body: {
      rows: { code: string; agentFactor: number; partnerFactor: number; tradeFactor: number; retailFactor: number }[];
    },
  ) {
    return this.service.bulkUpdateXGroups(body.rows);
  }

  @Get('settings')
  @Permissions('products.managePricing')
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  @Permissions('products.managePricing')
  updateSettings(
    @Body() body: {
      roundBelow50?: number; roundBelow100?: number; roundAbove100?: number;
      priceOffset?: number; minSalesPrice?: number;
    },
  ) {
    return this.service.updateSettings(body);
  }
}
