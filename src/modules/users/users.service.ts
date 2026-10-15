import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { join } from 'path';
import * as fs from 'fs';
import { GraphMailService } from '../notifications/graph-mail.service';
import { forgotPasswordHtml } from '../notifications/email-templates';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';


type ListParams = {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  skip?: number;
  take?: number;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: GraphMailService,
      private readonly config: ConfigService,
    ) {}

  private get prismaAny() {
    return this.prisma as any;
  }

async list(params: {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  skip: number;
  take: number;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, string>;
}) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  /* ---------- STATUS (top dropdown) ---------- */
  if (params.status === 'active') where.isActive = true;
  if (params.status === 'inactive') where.isActive = false;

  /* ---------- SEARCH ---------- */
  if (params.search?.trim()) {
    const term = params.search.trim();
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { displayName: { contains: term, mode: 'insensitive' } },
    ];
  }

  /* ---------- COLUMN FILTERS ---------- */

  if (params.filters?.email) {
    where.email = {
      in: params.filters.email.split(','),
    };
  }

  if (params.filters?.name) {
    const values = params.filters.name.split(',');

    where.OR = values.flatMap(v => [
      { displayName: { contains: v, mode: 'insensitive' } },
      { firstName: { contains: v, mode: 'insensitive' } },
      { lastName: { contains: v, mode: 'insensitive' } },
    ]);
  }

  // Roles filter
  if (params.filters?.roles) {
    where.userRoles = {
      some: {
        role: { name: { in: params.filters.roles.split(',') } },
      },
    };
  }

  // Status column filter
  // if (params.filters?.status) {
  //   const values = params.filters.status.split(',');

  //   if (values.length === 1) {
  //     where.isActive = values[0] === 'Active';
  //   }
  //   // if both selected → no filter
  // }

  // Status filter
  if (params.filters?.status) {
    const values = params.filters.status.split(',');
    where.isActive = values.includes('Active');
  }

  // Last login filter
  if (params.filters?.lastLogin) {
    const dates = params.filters.lastLogin.split(',');

    where.OR = dates.map((d) => {
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      return {
        lastLoginAt: {
          gte: start,
          lt: end,
        },
      };
    });
  }

  /* ---------- SORT (MAP UI → DB) ---------- */
  const sortMap: Record<string, keyof Prisma.UserOrderByWithRelationInput> = {
    user: 'displayName',
    status: 'isActive',
    lastLogin: 'lastLoginAt',
    email: 'email',
    createdAt: 'createdAt',
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    params.sortKey && sortMap[params.sortKey]
      ? { [sortMap[params.sortKey]]: params.sortDir ?? 'asc' }
      : { createdAt: 'desc' };

  /* ---------- QUERY ---------- */
  const [users, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy,
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    }),
    this.prisma.user.count({ where }),
  ]);

  const items = users.map((u) => ({
    ...u,
    roles: u.userRoles.map((ur) => ur.role),
  }));

  return { items, total };
}


  async findOne(id: string) {
    const user = await this.prismaAny.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.userRoles.map((ur: any) => ur.role),
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prismaAny.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('A user with that email already exists.');
    }

    // temporary password for invite flow
    const tempPassword = dto.defaultPassword
      //'Airco!' + Math.random().toString(36).slice(2, 8) + '1a';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const displayName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();

    const user = await this.prismaAny.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: displayName || undefined,
        phone: dto.phone,
        passwordHash,
        isActive: false, //dto.isActive ?? false,
        mustChangePassword: false,
        status: "Available"
      },
    });

    await this.createAndAssignDefaultJobs(user.id);
    
    if (dto.roleIds && dto.roleIds.length) {
      for (const roleId of dto.roleIds) {
        await this.prismaAny.userRole.create({
          data: {
            userId: user.id,
            roleId,
          },
        });
      }
    }

    await this.logAudit(actorId, 'user.invited', 'User', user.id, {
      email: user.email,
      roleIds: dto.roleIds ?? [],
    });

    await this.sendActivationEmail(user, tempPassword);


    // TODO: send real invite email – for now log temp password
    // eslint-disable-next-line no-console
    console.log(
      `Invite created for ${user.email}. Temporary password: ${tempPassword}`,
    );

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prismaAny.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const displayName = `${dto.firstName ?? user.firstName ?? ''} ${
      dto.lastName ?? user.lastName ?? ''
    }`.trim();

    const updated = await this.prismaAny.user.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? user.firstName,
        lastName: dto.lastName ?? user.lastName,
        displayName: displayName || user.displayName,
        phone: dto.phone ?? user.phone,
        defaultLandingPage: dto.defaultLandingPage ?? user.defaultLandingPage, 
        isActive:
          typeof dto.isActive === 'boolean' ? dto.isActive : user.isActive,
        
        mfaEnabled: dto.mfaEnabled,
        mfaSecret: '',
      },
    });

    if (dto.roleIds) {
      await this.prismaAny.userRole.deleteMany({ where: { userId: id } });

      for (const roleId of dto.roleIds) {
        await this.prismaAny.userRole.create({
          data: {
            userId: id,
            roleId,
          },
        });
      }
    }

    await this.logAudit(actorId, 'user.updated', 'User', id, {
      update: dto,
    });

    return this.findOne(updated.id);
  }

  //Soft Delete
  async deactivate(id: string, actorId: string | null) {
    const isFirst = await this.isFirstUser(id);    
    if (isFirst) {
      throw new BadRequestException(
        'The primary system user cannot be deactivated.',
      );
    }    
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date(),
       },
    });
    await this.logAudit(actorId, 'user.deactivated', 'User', id);
    return updated;
  }

  // async purge(id: string, actorId: string | null) {
  //   const user = await this.prisma.user.findUnique({ where: { id } });
  //   if (!user) throw new NotFoundException('User not found');

  //   await this.prisma.$transaction([
  //     this.prisma.userRole.deleteMany({ where: { userId: id } }),
  //     this.prisma.userJob.deleteMany({ where: { userId: id } }),
  //     this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
  //     this.prisma.auditLog.deleteMany({ where: { entityId: id } }),
  //     this.prisma.user.delete({ where: { id } }),
  //   ]);
  //   await this.logAudit(actorId, 'user.purged', 'User', id);
  //   return { id };
  // }

  private async isFirstUser(userId: string): Promise<boolean> {
    const firstUser = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return firstUser?.id === userId;
  }

  async purge(id: string, actorId: string | null) {

    const isFirst = await this.isFirstUser(id);    
    if (isFirst) {
      throw new BadRequestException(
        'The primary system user cannot be deactivated.',
      );
    }  
    
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      // auth schema
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }), // ✅ REQUIRED
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.deleteMany({ where: { userId: id } }),

      // admin schema
      this.prisma.userJob.deleteMany({ where: { userId: id } }),
      this.prisma.auditLog.deleteMany({
        where: {
          OR: [{ entityId: id }, { actorId: id }],
        },
      }),

      // finally the user
      this.prisma.user.delete({ where: { id } }),
    ]);

    await this.logAudit(actorId, 'user.purged', 'User', id);

    return { id };
  }




  async setStatus(id: string, isActive: boolean, actorId: string) {
    const user = await this.prismaAny.user.update({
      where: { id },
      data: { isActive },
    });

    await this.logAudit(actorId, 'user.statusChanged', 'User', id, {
      isActive,
    });

    return this.findOne(user.id);
  }

  async remove(id: string, actorId: string | null, options?: { cascade?: boolean }) {
    const user = await this.prismaAny.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prismaAny.userRole.deleteMany({ where: { userId: id } });

    // If there are other relations to clear (e.g., owned entities), handle them here.
    // Example:
    // if (options?.cascade) {
    //   await this.prismaAny.project.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
    // }

    // Finally delete user
    await this.prismaAny.user.delete({ where: { id } });

    await this.logAudit(actorId, 'user.deleted', 'User', id, { cascade: !!options?.cascade });
    // return removed id for client convenience
    return { id };
  }

  private async logAudit(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any,
  ) {
    try {
      await this.prismaAny.auditLog.create({
        data: {
          actorId: actorId ?? null,
          actorType: 'User',
          action,
          entityType,
          entityId,
          metadata: metadata ?? {},
        },
      });
    } catch (e) {
      // don't break main flow if audit fails
      // eslint-disable-next-line no-console
      console.error('Audit log failed', e);
    }
  }


// users.service.ts
async uploadAvatar(userId: string, filename: string, actorId: string | null, extras?: any) {
  const user = await this.prismaAny.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');
  const avatarUrl = extras?.avatarUrl ?? `/uploads/avatars/${filename}`;

  await this.prismaAny.user.update({
    where: { id: userId },
    data: { profilePhotoUrl: avatarUrl },
  });

  await this.logAudit(actorId, 'user.avatarUpdated', 'User', userId, { profilePhotoUrl: avatarUrl });

  // return the new URL; 
  return { id: userId, profilePhotoUrl: avatarUrl };
}


async setAvatarUrl(userId: string, relativePath: string, actorId?: string | null) {
    const existing = await this.prismaAny.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prismaAny.user.update({
      where: { id: userId },
      data: {
        profilePhotoUrl: relativePath,
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    // Optionally: log audit
    try {
      await this.prismaAny.auditLog.create({
        data: {
          actorId: actorId ?? null,
          actorType: 'User',
          action: 'user.avatarUpdated',
          entityType: 'User',
          entityId: userId,
          metadata: { avatar: relativePath },
        },
      });
    } catch (e) {
      console.warn('audit log failed', e);
    }

    const mapped = {
      ...updated,
      roles: (updated.userRoles ?? []).map((ur: any) => ur.role),
    };

    return mapped;
  }

  async resendActivation(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.isActive) {
      return { success: true }; // prevent enumeration
    }

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        type: 'ACCOUNT_ACTIVATION',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.sendActivationEmail(user, 'Use the previously sent password');

    return { success: true };
  }

  
  private async sendActivationEmail(user: any, tempPassword: string) {
    const token = randomBytes(32).toString('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        type: 'ACCOUNT_ACTIVATION',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      },
    });

    const baseUrl =
      this.config.get('APP_BASE_URL') ?? 'http://localhost:9000';

    const activationUrl = `${baseUrl}/auth/activate?token=${token}`;

    const html = `
      <p>Hello ${user.displayName},</p>

      <p>Your AIRCO AIMS account has been created.</p>

      <p><b>Temporary password:</b> ${tempPassword}</p>

      <p>Please activate your account:</p>
      <p><a href="${activationUrl}">Activate account</a></p>

      <p>This link expires in 24 hours.</p>
    `;

    await this.mailService.sendMail({
      to: user.email,
      subject: 'AIRCO AIMS – Activate your account',
      html,
      fromDisplayName: this.config.get('EMAIL_FROM_NAME') ?? 'AIRCO AIMS',
      saveToSentItems: true,
    });
  }

async createAndAssignDefaultJobs(userId: string) {
    const prismaAny = this.prisma as any;
    const JOB_COUNT = 6;
    // Get last job number
    const lastJob = await prismaAny.job.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { jobNumber: true },
    });

    let lastNumber = 1000;
    if (lastJob?.jobNumber) {
      const match = lastJob.jobNumber.match(/\d+$/);
      if (match) lastNumber = parseInt(match[0], 10);
    }

    const jobs = [];

    for (let i = 1; i <= JOB_COUNT; i++) {
      const job = await prismaAny.job.create({
        data: {
          jobNumber: `JOB-${lastNumber + i}`,
          customer: 'Auto Assigned',
          shortAddress: `Auto address ${i}`,
          scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * i),
          status: 'scheduled',
          priority: 'medium',
        },
      });

      jobs.push(job);

      await prismaAny.userJob.create({
        data: {
          userId,
          jobId: job.id,
        },
      });
    }

    return jobs;
  }
}
