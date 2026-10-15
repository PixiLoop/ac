import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertXeroConfigDto } from './dto/xero-config.dto';

@Injectable()
export class XeroConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.xeroConfig.findFirst();
    if (!config) return null;
    // Mask secret on return
    return {
      ...config,
      clientSecret: config.clientSecret ? '••••••••••••' : '',
    };
  }

  async upsert(dto: UpsertXeroConfigDto) {
    const existing = await this.prisma.xeroConfig.findFirst();

    // If secret is masked (user didn't change it), keep existing
    const clientSecret =
      dto.clientSecret === '••••••••••••' && existing
        ? existing.clientSecret
        : dto.clientSecret;

    if (existing) {
      return this.prisma.xeroConfig.update({
        where: { id: existing.id },
        data: { ...dto, clientSecret },
      });
    }

    return this.prisma.xeroConfig.create({
      data: { ...dto, clientSecret },
    });
  }
}