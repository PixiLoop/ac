import { Module } from '@nestjs/common';
import { FMSubscriptionReportsController } from './fm-subscription-reports.controller';
import { FMSubscriptionReportsService } from './fm-subscription-reports.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FMSubscriptionReportsController],
  providers: [FMSubscriptionReportsService],
  exports: [FMSubscriptionReportsService],
})
export class FMSubscriptionReportsModule {}