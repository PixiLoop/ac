import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallationsService } from './installations.service';
import { InstallationsController } from './installations.controller';

@Module({
  controllers: [InstallationsController],
  providers: [InstallationsService, PrismaService],
  exports: [InstallationsService],
})
export class InstallationsModule { }
