import { Module } from '@nestjs/common';
import { FMInstallController } from './fm-install.controller';
import { FMInstallService } from './fm-install.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FMInstallController],
  providers: [FMInstallService],
})
export class FMInstallModule {}