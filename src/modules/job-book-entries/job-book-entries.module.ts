import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobBookEntriesController } from './job-book-entries.controller';
import { JobBookEntriesService } from './job-book-entries.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobBookEntriesController],
  providers: [JobBookEntriesService],
  exports: [JobBookEntriesService],
})
export class JobBookEntriesModule {}
