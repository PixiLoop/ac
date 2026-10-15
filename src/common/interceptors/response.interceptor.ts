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


import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => ({ status: true, message: data?.message || null, data: data?.data ?? data, meta: data?.meta ?? null })));
  }
}
