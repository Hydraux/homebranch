// infrastructure/filters/domain-failure.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  InvalidCredentialsError,
  InvalidTokenError,
  RefreshTokenRevokedError,
  TokenExpiredError,
} from 'src/modules/auth/auth.exceptions';
import { ForbiddenError } from 'src/common/exceptions/forbidden.exception';
import { DomainException } from 'src/common/exceptions/domain_exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(failure: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let message: string;
    let code: string;

    // Map domain failures to HTTP responses
    if (failure instanceof InvalidCredentialsError) {
      status = HttpStatus.UNAUTHORIZED;
      message = failure.message;
      code = 'INVALID_CREDENTIALS';
    } else if (failure instanceof InvalidTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      message = failure.message;
      code = 'INVALID_TOKEN';
    } else if (failure instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      message = failure.message;
      code = 'TOKEN_EXPIRED';
    } else if (failure instanceof RefreshTokenRevokedError) {
      status = HttpStatus.UNAUTHORIZED;
      message = failure.message;
      code = 'REFRESH_TOKEN_REVOKED';
    } else if (failure instanceof ForbiddenError) {
      status = HttpStatus.FORBIDDEN;
      message = failure.message;
      code = 'FORBIDDEN';
    } else if (failure instanceof Error) {
      // Generic error handling
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_ERROR';

      // Log unexpected errors
      this.logger.error(`Unexpected error: ${failure.message}`, failure.stack, {
        url: request.url,
        method: request.method,
      });
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
    }

    const errorResponse = {
      message: [message],
      error: code,
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }
}
