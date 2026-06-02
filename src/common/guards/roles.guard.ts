import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/guards/roles.decorator';
import { ForbiddenError } from 'src/common/exceptions/forbidden.exception';

interface RequestUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.roles?.length) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const hasRole = requiredRoles.some((requiredRole) =>
      user.roles.some((userRole) => userRole.toUpperCase() === requiredRole.toUpperCase()),
    );

    if (!hasRole) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return true;
  }
}
