import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphMailService } from './graph-mail.service';

@Module({
  imports: [ConfigModule],
  providers: [GraphMailService],
  exports: [GraphMailService],
})
export class NotificationsModule {}
