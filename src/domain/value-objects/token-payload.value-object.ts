export class JwtPayload {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly roles: string[],
    public readonly issuedAt: Date,
    public readonly expiresAt: Date
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  toPlainObject(): Record<string, any> {
    return {
      sub: this.userId, // Standard JWT subject
      email: this.email,
      roles: this.roles,
      iat: Math.floor(this.issuedAt.getTime() / 1000),
      exp: Math.floor(this.expiresAt.getTime() / 1000),
    };
  }

  static fromPlainObject(payload: any): JwtPayload {
    return new JwtPayload(
      payload.sub,
      payload.email,
      payload.roles || [],
      new Date(payload.iat * 1000),
      new Date(payload.exp * 1000),
    );
  }
}