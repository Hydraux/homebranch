/* eslint-disable */
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should map sub to id and return user object', async () => {
    const payload = { sub: 'user-1', email: 'alice@example.com', roles: ['USER'] };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'user-1', email: 'alice@example.com', roles: ['USER'] });
  });

  it('should return multiple roles', async () => {
    const payload = { sub: 'admin-1', email: 'admin@example.com', roles: ['USER', 'ADMIN'] };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'admin-1', email: 'admin@example.com', roles: ['USER', 'ADMIN'] });
  });

  it('should default roles to empty array when missing from payload', async () => {
    const payload = { sub: 'user-2', email: 'bob@example.com' };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'user-2', email: 'bob@example.com', roles: [] });
  });

  it('should preserve email from payload', async () => {
    const payload = { sub: 'user-3', email: 'charlie@example.com', roles: [] };
    const result = await strategy.validate(payload as any);
    expect(result.email).toBe('charlie@example.com');
  });

  // Authentication service issues "role" (singular string) — normalize to roles array
  it('should normalize singular role string from Authentication token to roles array', async () => {
    const payload = { sub: 'user-4', email: 'dave@example.com', role: 'ADMIN' };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'user-4', email: 'dave@example.com', roles: ['ADMIN'] });
  });

  it('should normalize USER role from Authentication token to roles array', async () => {
    const payload = { sub: 'user-5', email: 'eve@example.com', role: 'USER' };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'user-5', email: 'eve@example.com', roles: ['USER'] });
  });

  it('should prefer roles array over singular role when both are present', async () => {
    const payload = { sub: 'user-6', email: 'frank@example.com', role: 'USER', roles: ['ADMIN'] };
    const result = await strategy.validate(payload as any);
    expect(result.roles).toEqual(['ADMIN']);
  });
});
