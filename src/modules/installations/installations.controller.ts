import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
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
    @Body() payload: { technicianId: string; assignedTo: "technician" | "contractor" | "subcontractor", date: string; startTime: string; endTime: string; notes?: string }
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

  @Post(':id/checklist/regenerate')
  async regenerateChecklist(@Param('id') id: string) {
    return this.installationsService.regenerateChecklist(id);
  }

  @Post(':id/line-items')
  async addLineItem(@Param('id') id: string, @Body() body: any) {
    return this.installationsService.addLineItem(id, body);
  }

  @Put(':id/line-items/:itemId')
  async updateLineItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.installationsService.updateLineItem(id, itemId, body);
  }

  @Delete(':id/line-items/:itemId')
  async removeLineItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.installationsService.removeLineItem(id, itemId);
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

  @Post(':id/checklist/:sectionId/items/:itemId/comments')
  async addChecklistComment(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() body: { text: string; authorName?: string },
  ) {
    return this.installationsService.addChecklistComment(id, sectionId, itemId, body);
  }

  @Delete(':id/checklist/:sectionId/items/:itemId/comments/:commentId')
  async removeChecklistComment(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.installationsService.removeChecklistComment(id, sectionId, itemId, commentId);
  }

  @Post(':id/checklist/:sectionId/items/:itemId/photos')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  async addChecklistPhoto(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.installationsService.addChecklistPhoto(id, sectionId, itemId, file);
  }

  @Get(':id/checklist/:sectionId/items/:itemId/photos/:photoId/file')
  async getChecklistPhotoFile(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.installationsService.getChecklistPhotoFile(
      id,
      sectionId,
      itemId,
      photoId,
    );
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @Delete(':id/checklist/:sectionId/items/:itemId/photos/:photoId')
  async removeChecklistPhoto(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.installationsService.removeChecklistPhoto(id, sectionId, itemId, photoId);
  }
}
