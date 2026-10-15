import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import configuration from './config/configuration';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import * as path from 'path';
import { ActivityModule } from './common/activity/activity.module';
import { CustomersModule } from './modules/customers/customers.module'
import { SalesOrdersModule } from './modules/salesorders/salesorders.module'
import { CommentsModule } from './modules/comments/comments.module'
import { FMCustomersModule } from './modules/fm-customers/fm-customers.module'
import { JobBoardsModule } from './modules/job-boards/job-boards.module'
import { ProductsModule } from './modules/products/products.module'
import { QuotationsModule } from './modules/quotations/quotations.module'
import { FMPreinstallModule } from './modules/fm-preinstall/fm-preinstall.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { XeroModule } from './modules/xero/xero.module';
import { FMInstallModule } from './modules/fm-install/fm-install.module';
import { PickingSlipsModule } from './modules/picking-slips/picking-slips.module';
import { DispatchMethodsModule } from './modules/dispatch-methods/dispatch-methods.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { FMSubscriptionReportsModule } from './modules/fm-subscription-reports/fm-subscription-reports.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

@Module({ 
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      load: [configuration],
      envFilePath: path.resolve(__dirname, '../../../.env'),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    JobsModule,
    NotificationsModule,
    ActivityModule,
    CustomersModule,
    SalesOrdersModule,
    CommentsModule,
    FMCustomersModule,
    JobBoardsModule,
    ProductsModule,
    QuotationsModule,
    FMPreinstallModule,
    InventoryModule,
    InvoicesModule,
    XeroModule,
    FMInstallModule,
    PickingSlipsModule,
    DispatchMethodsModule,
    DispatchModule,
    OrganizationsModule,
    InstallationsModule,
    TechniciansModule,
    TemplatesModule,
    FMSubscriptionReportsModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    }
  ],
})
export class AppModule {}
