import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstallationsService } from './installations.service';

@Controller('installations')
@UseGuards(JwtAuthGuard)
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Get()
  async getInstallations(@Query() query: Record<string, any>) {
    if (query?.dispatches || query?.filter_dispatchNumber || query?.filter_conNote) {
      const data = await this.installationsService.getAllDispatches(query);
      return { data };
    }
    return this.installationsService.listJobs(query);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.installationsService.getJob(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.installationsService.createJob(body);
  }

  @Put(':id/schedule')
  async schedule(
    @Param('id') id: string,
    @Body() payload: { technicianId: string; date: string; startTime: string; endTime: string; notes?: string }
  ) {
    return this.installationsService.scheduleJob(id, payload);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: { newStatus: string; note?: string; updatedBy?: string; bypassValidation?: boolean }
  ) {
    return this.installationsService.updateStatus(id, payload);
  }

  @Post(':id/hardware')
  async addHardware(@Param('id') id: string, @Body() hardware: any) {
    return this.installationsService.addHardware(id, hardware);
  }

  @Delete(':id/hardware/:hardwareId')
  async removeHardware(@Param('id') id: string, @Param('hardwareId') hardwareId: string) {
    return this.installationsService.removeHardware(id, hardwareId);
  }

  @Put(':id/checklist/:sectionId/items/:itemId')
  async updateChecklistItem(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() payload: { completed?: boolean; notes?: string; completedBy?: string }
  ) {
    return this.installationsService.updateChecklistItem(id, sectionId, itemId, payload);
  }
}
