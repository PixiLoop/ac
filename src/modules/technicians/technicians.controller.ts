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
import { TechniciansService } from './technicians.service';
import { CreateTechniciansDto } from './dto/technicians.dto';

@Controller('technicians')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  @Permissions('technicians.view')
  async list(@Query() query: Record<string, any>) {
    const data = await this.techniciansService.getAllTechnicians(query);
    return { data };
  }

  @Get(':id')
  @Permissions('technicians.view')
  async getOne(@Param('id') id: string) {
    return this.techniciansService.findOne(id);
  }
}