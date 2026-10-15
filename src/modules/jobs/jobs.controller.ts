import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('assigned')
  async getAssigned(
    @Req() req: any,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
    @Query('status') status = 'all',
    @Query('search') search?: string,
  ) {
    const userId = req.user?.id;
    const numSkip = Number(skip) || 0;
    const numTake = Number(take) || 20;

    const data = await this.jobsService.findAssigned({
      userId,
      skip: numSkip,
      take: numTake,
      status,
      search,
    });

    return { data };
  }
}
