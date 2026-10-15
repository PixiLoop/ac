import { Module } from '@nestjs/common';
import { XeroConfigController } from './xero-config.controller';
import { XeroConfigService } from './xero-config.service';
import { XeroOAuthService } from './xero-oauth.service';
import { XeroInvoiceService } from './xero-invoice.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [XeroConfigController],
  providers: [XeroConfigService, XeroOAuthService, XeroInvoiceService, PermissionsGuard],
  exports: [XeroConfigService, XeroOAuthService, XeroInvoiceService],
})
export class XeroModule {}