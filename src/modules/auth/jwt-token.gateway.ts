import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError, InvalidTokenError } from 'src/modules/auth/auth.exceptions';
import { JwtPayload } from 'src/common/value-objects/token-payload.value-object';

@Injectable()
export class JwtTokenGateway {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload: Record<string, any> = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      return JwtPayload.fromPlainObject(payload);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw new InvalidTokenError();
    }
  }
}
