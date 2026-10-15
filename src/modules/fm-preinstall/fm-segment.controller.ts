import { Controller, Get, Query } from '@nestjs/common';
import { FMPreinstallService } from './fm-preinstall.service';

@Controller('fm-segments')
export class FMSegmentController {
  constructor(private readonly service: FMPreinstallService) {}

  @Get()
  getSegments(@Query() query: any) {
    return this.service.getSegments(query);
  }
}