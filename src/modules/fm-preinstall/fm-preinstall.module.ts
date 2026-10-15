import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FMPreinstallController } from './fm-preinstall.controller';
import { FMSegmentController } from './fm-segment.controller';
import { FMPreinstallService } from './fm-preinstall.service';
import { JobBoardsModule } from '../job-boards/job-boards.module';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';

@Module({
    imports: [PrismaModule, JobBoardsModule],
    controllers: [
        FMPreinstallController,
        FMSegmentController,
    ],
    providers: [FMPreinstallService, PermissionsGuard],
})
export class FMPreinstallModule { }