import { Module } from '@nestjs/common'
import { ActivityController } from './activity.controller'
import { ActivityStreamService } from './activity-stream.service'

@Module({
  controllers: [ActivityController],
  providers: [ActivityStreamService],
  exports: [ActivityStreamService]
})
export class ActivityModule {}
