import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityStreamService } from '../../common/activity/activity-stream.service';

interface AuditMeta {
  action?: string;
  entityType?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private activityStream: ActivityStreamService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AuditMeta>('audit', context.getHandler());
    if (!meta) return next.handle();

    const { action, entityType } = meta;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for'] || null;

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const prismaAny = this.prisma as any;

          // -------------------------------
          // SAVE AUDIT LOG (existing)
          // -------------------------------
          if (prismaAny?.auditLog?.create) {
            await prismaAny.auditLog.create({
              data: {
                actorId: user?.id || null,
                actorType: user ? 'user' : 'system',
                action,
                entityType,
                entityId: result?.id || null,
                ip: ip?.toString?.() ?? null,
                metadata: {
                  body: req.body,
                  params: req.params,
                  result: result ?? null,
                },
              },
            });
          }

          // ---------------------------------
          // EMIT LIVE ACTIVITY EVENT (NEW)
          // ---------------------------------

          console.log(' AUDIT INTERCEPTOR EMIT')

          this.activityStream.emit({
            type: action ?? 'UNKNOWN',
            message: this.buildMessage(action, entityType, user),
            timestamp: new Date().toISOString(),
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                }
              : undefined,
          });
        } catch (err) {
          console.error('audit log failed', err);
        }
      }),
    );
  }

  // ---------------------------------
  // Helper to generate readable message
  // ---------------------------------
  private buildMessage(
    action?: string,
    entityType?: string,
    user?: any,
  ): string {
    const actor = user?.email ?? 'System';
    const act = action?.replace(/_/g, ' ') ?? 'performed an action';
    const entity = entityType ?? 'entity';

    return `${actor} ${act} on ${entity}`;
  }
}
