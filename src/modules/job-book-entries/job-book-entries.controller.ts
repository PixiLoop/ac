import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobBookEntriesService } from './job-book-entries.service';

@Controller('job-book-entries')
@UseGuards(JwtAuthGuard)
export class JobBookEntriesController {
  constructor(private readonly service: JobBookEntriesService) {}

  @Get()
  list(@Query() query: Record<string, any>) {
    return this.service.list(query);
  }

  @Get('customer-lookup')
  lookupCustomer(@Query('number') number?: string) {
    return this.service.lookupCustomer(number ?? '');
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
