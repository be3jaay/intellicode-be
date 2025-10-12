import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    LoggerService,
    {
      provide: 'LOGGER_FACTORY',
      useFactory: () => {
        return (context?: string, logLevel?: any) => {
          const logger = new LoggerService();
          if (context) logger.setContext(context);
          if (logLevel !== undefined) logger.setLogLevel(logLevel);
          return logger;
        };
      },
    },
  ],
  exports: [LoggerService, 'LOGGER_FACTORY'],
})
export class LoggerModule {} 