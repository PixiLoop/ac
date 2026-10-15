// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Prisma 5: still works normally
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma 5: DO NOT use this.$on('beforeExit')
    // Instead attach to Node process
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
