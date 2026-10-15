import { Module } from '@nestjs/common'
import { JobBoardsController } from './job-boards.controller'
import { JobBoardsService } from './job-boards.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AzureStorageModule } from '../../common/azure/azure-storage.module'
import { AuthModule } from '../auth/auth.module'
import { PermissionsGuard } from '../../common/rbac/permissions.guard'

@Module({
  imports: [PrismaModule, AzureStorageModule, AuthModule],
  controllers: [JobBoardsController],
  providers: [JobBoardsService, PermissionsGuard],
  exports: [JobBoardsService],
})
export class JobBoardsModule {}
