import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AzureStorageModule } from '../../common/azure/azure-storage.module';
import { InstallationsService } from './installations.service';
import { InstallationsController } from './installations.controller';

@Module({
  imports: [PrismaModule, AzureStorageModule],
  controllers: [InstallationsController],
  providers: [InstallationsService],
  exports: [InstallationsService],
})
export class InstallationsModule {}
