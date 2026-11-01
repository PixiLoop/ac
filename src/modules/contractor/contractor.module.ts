import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractorService } from './contractor.service';
import { ContractorController } from './contractor.controller';

@Module({
  controllers: [ContractorController],
  providers: [ContractorService, PrismaService],
  exports: [ContractorService],
})
export class ContractorModule { }
