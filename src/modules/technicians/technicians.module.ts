import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TechniciansService } from './technicians.service';
import { TechniciansController } from './technicians.controller';

@Module({
  controllers: [TechniciansController],
  providers: [TechniciansService, PrismaService],
  exports: [TechniciansService],
})
export class TechniciansModule { }
