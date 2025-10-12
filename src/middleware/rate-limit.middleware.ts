import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../utils/logger/logger.service';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests = 100; // max requests per window
  private readonly logger = new LoggerService();
  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientKey(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanup();

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      if (now > this.store[key].resetTime) {
        // Reset window
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs,
        };
      } else {
        this.store[key].count++;
      }
    }

    const current = this.store[key];
    const remaining = Math.max(0, this.maxRequests - current.count);

    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(current.resetTime).toISOString(),
    );

    if (current.count > this.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key}`, 'RateLimit');
      res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });
      return;
    }

    next();
  }

  private getClientKey(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}
