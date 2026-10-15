import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true; // no permissions required
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    const perms = user.permissions || [];
    const allowed = required.some(r => perms.includes(r));
    if (!allowed) throw new ForbiddenException('Permission denied');
    return allowed;
  }
}
