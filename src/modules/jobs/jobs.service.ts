import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ListAssignedParams = {
  userId: string;
  skip?: number;
  take?: number;
  status?: string;
  search?: string;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private prisma: PrismaService) {}

  async findAssigned(params: ListAssignedParams) {
    const { userId, skip = 0, take = 20, status, search } = params;
    this.logger.log(`findAssigned called for userId=${userId} skip=${skip} take=${take} status=${status} search=${search}`);
    
    const assigned = await this.prisma.userJob.findMany({
      where: { userId },
      select: { jobId: true },
    });

    this.logger.debug(`assigned rows: ${assigned.length}`);
    const jobIds = assigned.map((a) => a.jobId);
    this.logger.debug(`jobIds: ${JSON.stringify(jobIds)}`);

    if (jobIds.length === 0) {
      return { items: [], total: 0, skip, take };
    }

    const baseWhere: any = {};
    if (status && status !== 'all') baseWhere.status = status;
    if (search) {
      baseWhere.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { customer: { contains: search, mode: 'insensitive' } },
        { shortAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3) fetch jobs
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { id: { in: jobIds }, ...baseWhere },
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: { userJobs: true },
      }),
      this.prisma.job.count({
        where: { id: { in: jobIds }, ...baseWhere },
      }),
    ]);

    this.logger.log(`found ${items.length} jobs (total ${total}) for user ${userId}`);
    return { items, total, skip, take };
  }
}
