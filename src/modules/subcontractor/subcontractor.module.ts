import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubContractorService } from './subcontractor.service';
import { SubContractorController } from './subcontractor.controller';

@Module({
  controllers: [SubContractorController],
  providers: [SubContractorService, PrismaService],
  exports: [SubContractorService],
})
export class SubContractorModule { }
