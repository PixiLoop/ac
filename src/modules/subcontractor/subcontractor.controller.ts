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
import { SubContractorService } from './subcontractor.service';

@Controller('subcontractor')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubContractorController {
  constructor(private readonly subContractorService: SubContractorService) {}

  @Get()
  @Permissions('subcontractor.view')
  async list(@Query() query: Record<string, any>) {
    const data = await this.subContractorService.getAllSubContractor(query);
    return { data };
  }
}