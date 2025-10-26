import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../utils/logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new LoggerService();

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';

    this.logger.log(`Incoming ${method} ${originalUrl}`, 'RequestLogger', {
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    const originalEnd = res.end;
    const middleware = this;

    res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const { statusCode } = res;

      middleware.logger.log(`Outgoing ${method} ${originalUrl} - ${statusCode}`, 'RequestLogger', {
        responseTime: `${responseTime}ms`,
        statusCode,
        contentLength: res.get('content-length') || 0,
      });

      return originalEnd.call(res, chunk, encoding, cb);
    };

    next();
  }
}
