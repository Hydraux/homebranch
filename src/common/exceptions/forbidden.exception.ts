import { DomainException } from 'src/common/exceptions/domain_exception';

export class ForbiddenError extends DomainException {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
