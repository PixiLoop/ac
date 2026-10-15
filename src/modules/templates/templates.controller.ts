// checklist-templates.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ChecklistTemplatesService } from './templates.service';
import {
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  AddSectionDto,
  AddItemDto,
  UpdateItemDto,
} from './dto/create-template.dto';

@Controller('templates')
export class ChecklistTemplatesController {
  constructor(private readonly templatesService: ChecklistTemplatesService) {}

  @Get()
  async findAll(@Query('search') search?: string, @Query('category') category?: string) {
    return this.templatesService.findAll({ search, category });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateChecklistTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChecklistTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/sections')
  async addSection(@Param('id') id: string, @Body() dto: AddSectionDto) {
    return this.templatesService.addSection(id, dto);
  }

  @Delete(':id/sections/:sectionId')
  async deleteSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.templatesService.deleteSection(id, sectionId);
  }

  @Post(':id/sections/:sectionId/items')
  async addItem(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.templatesService.addItem(id, sectionId, dto);
  }

  @Put(':id/sections/:sectionId/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.templatesService.updateItem(id, sectionId, itemId, dto);
  }

  @Delete(':id/sections/:sectionId/items/:itemId')
  async deleteItem(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.templatesService.deleteItem(id, sectionId, itemId);
  }
}