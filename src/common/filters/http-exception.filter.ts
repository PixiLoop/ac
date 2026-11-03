import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Logger } from 'pino';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger?: Logger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    this.logger?.error(exception.message);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
    });
  }
}
