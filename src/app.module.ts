import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { SupabaseModule } from './core/supabase/supabase.module';
import { SupabaseExceptionFilter } from './common/filters/supabase-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './utils/logger/logger.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { SecurityHeadersMiddleware } from './middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CourseModule } from './modules/course/course.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    LoggerModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    CourseModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SupabaseExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorsMiddleware,
        SecurityHeadersMiddleware,
        RateLimitMiddleware,
        RequestLoggerMiddleware,
      )
      .forRoutes('*');
  }
}

