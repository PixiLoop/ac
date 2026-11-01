import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { Permissions } from '../../common/rbac/permissions.decorator';
import { ContractorService } from './contractor.service';

@Controller('contractor')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractorController {
  constructor(private readonly contractorService: ContractorService) {}

  @Get()
  @Permissions('contractor.view')
  async list(@Query() query: Record<string, any>) {
    const data = await this.contractorService.getAllContractor(query);
    return { data };
  }
}