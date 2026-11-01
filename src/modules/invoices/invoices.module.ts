import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { XeroModule } from '../xero/xero.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { FMInstallModule } from '../fm-install/fm-install.module';

@Module({
  imports: [PrismaModule, XeroModule, AuthModule, NotificationsModule, FMInstallModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PermissionsGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}