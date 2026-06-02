import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

interface LoginResponse {
  success: boolean;
  value?: { accessToken?: string };
}

@Injectable()
export class HttpAuthGateway {
  private readonly logger = new Logger(HttpAuthGateway.name);

  async login(email: string, password: string): Promise<string> {
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    if (!authServiceUrl) {
      throw new UnauthorizedException('OPDS authentication is not available: AUTH_SERVICE_URL is not configured');
    }

    let response: Response;
    try {
      response = await fetch(`${authServiceUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      this.logger.error('Failed to reach auth service', err);
      throw new UnauthorizedException('Could not reach authentication service');
    }

    const body = (await response.json()) as LoginResponse;
    if (!body.success || !body.value?.accessToken) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return body.value.accessToken;
  }
}
