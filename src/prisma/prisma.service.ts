// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Connected to database');
    } catch (err: any) {
      console.warn('[PrismaService] Database offline or not configured — running in offline fallback mode:', err?.message || err);
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma 5: DO NOT use this.$on('beforeExit')
    // Instead attach to Node process
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
