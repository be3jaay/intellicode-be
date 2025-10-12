import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class SupabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SupabaseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      // Handle Supabase-specific errors
      if (exception.message.includes('duplicate key value')) {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        error = 'ConflictError';
      } else if (exception.message.includes('violates foreign key constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference to related resource';
        error = 'ForeignKeyError';
      } else if (exception.message.includes('JWT')) {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Invalid or expired token';
        error = 'UnauthorizedError';
      } else {
        message = exception.message;
        error = exception.name;
      }
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send consistent error response
    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

