
import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

@Module({
  imports: [  
    PrismaModule,
    AuthModule
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService, PermissionsGuard],
  exports: [QuotationsService],
})
export class QuotationsModule {}