import { Injectable, CanActivate, Inject, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ITokenGateway } from "src/application/interfaces/jwt-token.gateway";
import { TokenExpiredError } from "src/domain/exceptions/auth.exceptions";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject('TokenGateway')
    private readonly tokenGateway: ITokenGateway,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    const token = this.tokenGateway.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify access token (stateless verification)
      const payload = await this.tokenGateway.verifyAccessToken(token);

      // Add user info to request
      request.user = {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles,
      };

      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}