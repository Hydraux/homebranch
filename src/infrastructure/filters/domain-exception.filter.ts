// infrastructure/filters/domain-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  InvalidCredentialsError,
  InvalidTokenError,
  RefreshTokenRevokedError,
  TokenExpiredError,
} from 'src/domain/exceptions/auth.exceptions';
import { BookNotFoundError } from 'src/domain/exceptions/book.exceptions';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let message: string;
    let code: string;

    // Map domain exceptions to HTTP responses
    if (exception instanceof InvalidCredentialsError) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = 'INVALID_CREDENTIALS';
    } else if (exception instanceof InvalidTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = 'INVALID_TOKEN';
    } else if (exception instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = 'TOKEN_EXPIRED';
    } else if (exception instanceof RefreshTokenRevokedError) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = 'REFRESH_TOKEN_REVOKED';
    } else if (exception instanceof BookNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      code = 'BOOK_NOT_FOUND';
    } else if (exception instanceof Error) {
      // Generic error handling
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_ERROR';

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
        { url: request.url, method: request.method },
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
    }

    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(errorResponse);
  }
}
