import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(params: {
    search?: string;
    skip: number;
    take: number;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    filters?: Record<string, string>;
  }) {
    const where: Prisma.RoleWhereInput = {};

    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    if (params.filters?.name) {
      const values = params.filters.name.split(',');
      where.name = {
        in: values,
      };
    }


    if (params.filters?.description) {
      where.description = {
        contains: params.filters.description,
        mode: 'insensitive',
      };
    }

    if (params.filters?.createdAt) {
      const dates = params.filters.createdAt.split(',');

      where.OR = dates.map((date) => {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        return {
          createdAt: {
            gte: start,
            lt: end,
          },
        };
      });
    }


    const [roles, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.sortKey
          ? { [params.sortKey]: params.sortDir ?? 'asc' }
          : { createdAt: 'desc' },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    //normalize shape for frontend
    const items = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      createdAt: r.createdAt,
      permissions: r.rolePermissions.map((rp) => rp.permission),
      isTechnician: r.isTechnician
    }));

    return { items, total };
  }

  async findOne(id: string) {
    const r = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!r) {
      throw new NotFoundException('Role not found');
    }
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      permissions: (r.rolePermissions ?? []).map((rp: any) => rp.permission),
      isTechnician: r.isTechnician
    };
  }

  async create(dto: CreateRoleDto) {
    // create role
    const role = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description ?? null, isTechnician: dto.isTechnician ?? false },
    });

    if (dto.permissionIds && dto.permissionIds.length) {
      // create rolePermissions safely (ignore duplicates)
      await Promise.all(
        dto.permissionIds.map((pid) =>
          this.prisma.rolePermission.create({ data: { roleId: role.id, permissionId: pid } }).catch(() => null),
        ),
      );
    }

    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description ?? undefined,
        isTechnician: dto.isTechnician ?? false,
      },
    });

    // if permissionIds provided, replace permissions
    if (dto.permissionIds) {
      await this.setPermissions(id, dto.permissionIds);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    const exists = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!exists) throw new NotFoundException('Role not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (!permissionIds || permissionIds.length === 0) {
        return { roleId, permissions: [] };
      }

      const created = await Promise.all(
        permissionIds.map((pid) =>
          tx.rolePermission.create({ data: { roleId, permissionId: pid } }),
        ),
      );

      const permissions = await tx.permission.findMany({
        where: { id: { in: permissionIds } },
      });

      return { roleId, permissions };
    });
  }
}
