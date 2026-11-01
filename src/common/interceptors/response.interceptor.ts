// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   NestInterceptor,
// } from '@nestjs/common';
// import { Observable } from 'rxjs';

// @Injectable()
// export class ResponseInterceptor implements NestInterceptor {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const res = context.switchToHttp().getResponse();

//     // 🔑 DO NOT wrap SSE
//     if (res.getHeader('content-type') === 'text/event-stream') {
//       return next.handle();
//     }

//     return next.handle();
//   }
// }


import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Binary / file responses must not be JSON-wrapped
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
          return data;
        }

        const contentType = String(
          res.getHeader?.('Content-Type') || res.getHeader?.('content-type') || '',
        ).toLowerCase();
        if (
          contentType.startsWith('image/') ||
          contentType.startsWith('application/octet-stream') ||
          contentType.startsWith('multipart/') ||
          contentType === 'text/event-stream'
        ) {
          return data;
        }

        return {
          status: true,
          message: data?.message || null,
          data: data?.data ?? data,
          meta: data?.meta ?? null,
        };
      }),
    );
  }
}
