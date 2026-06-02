import { Test, TestingModule } from '@nestjs/testing';
import { DomainExceptionFilter } from 'src/common/filters/domain-exception.filter';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import {
  InvalidCredentialsError,
  InvalidTokenError,
  RefreshTokenRevokedError,
  TokenExpiredError,
} from 'src/modules/auth/auth.exceptions';
import { ForbiddenError } from 'src/common/exceptions/forbidden.exception';

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: { status: jest.Mock; json: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainExceptionFilter],
    }).compile();

    filter = module.get<DomainExceptionFilter>(DomainExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn(() => ({
        getResponse: jest.fn(() => mockResponse),
        getRequest: jest.fn(() => ({
          url: '/test',
          method: 'GET',
        })),
      })),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Handles InvalidCredentialsError', () => {
    const error = new InvalidCredentialsError();
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Invalid email or password'],
      error: 'INVALID_CREDENTIALS',
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  });

  test('Handles InvalidTokenError', () => {
    const error = new InvalidTokenError('Invalid token');
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Invalid token'],
      error: 'INVALID_TOKEN',
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  });

  test('Handles TokenExpiredError', () => {
    const error = new TokenExpiredError();
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Token has expired'],
      error: 'TOKEN_EXPIRED',
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  });

  test('Handles RefreshTokenRevokedError', () => {
    const error = new RefreshTokenRevokedError();
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Refresh token has been revoked'],
      error: 'REFRESH_TOKEN_REVOKED',
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  });

  test('Handles ForbiddenError', () => {
    const error = new ForbiddenError('Access denied');
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Access denied'],
      error: 'FORBIDDEN',
      statusCode: HttpStatus.FORBIDDEN,
    });
  });

  test('Handles generic Error', () => {
    const error = new Error('Generic error');
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Internal server error'],
      error: 'INTERNAL_ERROR',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  test('Handles unknown error type', () => {
    const error = 'Unknown error string';
    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: ['Unknown error occurred'],
      error: 'UNKNOWN_ERROR',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
