import { Injectable,  UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    const request = context?.switchToHttp?.()?.getRequest?.();
    // Allow checklist photo files to be retrieved seamlessly by img tags or authenticated requests
    if (request?.url?.includes('/photos/') && request?.url?.includes('/file')) {
      return user || { id: 'photo-viewer', role: 'TECHNICIAN' };
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
