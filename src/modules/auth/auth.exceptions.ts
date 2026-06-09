import { DomainException } from 'src/common/exceptions/domain_exception';

export class InvalidCredentialsError extends DomainException {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidTokenError extends DomainException {
  constructor(message = 'Invalid or malformed token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class TokenExpiredError extends DomainException {
  constructor() {
    super('Token has expired');
    this.name = 'TokenExpiredError';
  }
}

export class RefreshTokenRevokedError extends DomainException {
  constructor() {
    super('Refresh token has been revoked');
    this.name = 'RefreshTokenRevokedError';
  }
}
