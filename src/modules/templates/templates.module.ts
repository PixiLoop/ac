import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChecklistTemplatesService } from './templates.service';
import { ChecklistTemplatesController } from './templates.controller';

@Module({
  controllers: [ChecklistTemplatesController],
  providers: [ChecklistTemplatesService, PrismaService],
  exports: [ChecklistTemplatesService],
})
export class TemplatesModule { }
