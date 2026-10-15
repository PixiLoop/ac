import { Module } from '@nestjs/common';
import { DispatchMethodsController } from './dispatch-methods.controller';
import { DispatchMethodsService } from './dispatch-methods.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DispatchMethodsController],
  providers: [DispatchMethodsService],
})
export class DispatchMethodsModule {}