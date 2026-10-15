import { Module } from '@nestjs/common';
import { PickingSlipsController } from './picking-slips.controller';
import { PickingSlipsService } from './picking-slips.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [AuthModule, PrismaModule],
    controllers: [PickingSlipsController],
    providers: [PickingSlipsService],
    exports: [PickingSlipsService],
})
export class PickingSlipsModule {}