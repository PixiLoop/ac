import { Module } from '@nestjs/common';
import { SalesOrdersController } from './salesorders.controller';
import { SalesOrdersService } from './salesorders.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
    ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
})
export class SalesOrdersModule {}
