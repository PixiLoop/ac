// apps/api/src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './prisma/prisma.service';
import * as express from 'express';
import { join } from 'path';
import { ActivityStreamService } from './common/activity/activity-stream.service';

async function bootstrap() {
  //const app = await NestFactory.create(AppModule, { cors: true });

  const app = await NestFactory.create(AppModule, { 
      cors: {
        origin: 'http://localhost:3000',
        credentials: true,
      },
   });

  app.use(helmet());
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
console.log('CWD:', process.cwd());
console.log('API_BASE_URL  sss:', process.env.NEXT_PUBLIC_API_BASE_URL);

// app.enableCors({
//   origin: ['http://localhost:3000'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// });

  // Global error handler (standard API error format)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors: response wrapper + audit logging
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  //const activityStream = app.get(ActivityStreamService);
  
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    //new AuditInterceptor(reflector, prisma, activityStream),
  );

  // Ensure Prisma closes gracefully
  await prisma.enableShutdownHooks(app);

  const port = process.env.PORT || 4000;
  const uploadsDir = join(process.cwd(), 'apps', 'api', 'public', 'uploads');
  app.use('/api/uploads', express.static(uploadsDir));
  
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);


  console.log('===== BOOTSTRAP DEBUG =====');
  console.log('CWD:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('ENV FILE EXISTS (root):', require('fs').existsSync('.env'));
  console.log('ENV FILE EXISTS (../../.env):', require('fs').existsSync('../../.env'));
  console.log('===========================');


}

bootstrap();
