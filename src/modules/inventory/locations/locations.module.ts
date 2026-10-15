import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PermissionsGuard } from '../../../common/rbac/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [LocationsController],
  providers: [LocationsService, PermissionsGuard],
  exports: [LocationsService],
})
export class LocationsModule {}