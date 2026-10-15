import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
//import { EmailService } from '../../common/email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule,NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, PermissionsGuard],
  exports: [UsersService],
})
export class UsersModule {}
