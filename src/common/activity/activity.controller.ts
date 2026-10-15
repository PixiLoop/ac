import { Controller, Sse } from '@nestjs/common'
import { ActivityStreamService } from './activity-stream.service'

@Controller('events')
export class ActivityController {
  constructor(private readonly activity: ActivityStreamService) {}

  @Sse()
  stream() {
    return this.activity.stream$
  }
}
