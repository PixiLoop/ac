import { Module } from '@nestjs/common'
import { FMCustomersController } from './fm-customers.controller'
import { FMCustomersService } from './fm-customers.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { PermissionsGuard } from '../../common/rbac/permissions.guard'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FMCustomersController],
  providers: [FMCustomersService, PermissionsGuard],
})
export class FMCustomersModule {}
