import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { R2Storage } from 'src/modules/storage/r2-storage';

describe('R2Storage', () => {
  let provider: R2Storage;
  let send: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Storage,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                R2_BUCKET: 'test-bucket',
                APP_URL: 'http://localhost:3000',
                R2_ACCOUNT_ID: 'test-account',
                R2_ACCESS_KEY_ID: 'test-access-key',
                R2_SECRET_ACCESS_KEY: 'test-secret-key',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<R2Storage>(R2Storage);
    send = jest.fn();
    (provider as unknown as { s3: { send: jest.Mock } }).s3.send = send;
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('paginates listFiles results until R2 returns all objects', async () => {
    send
      .mockResolvedValueOnce({
        IsTruncated: true,
        NextContinuationToken: 'next-page',
        Contents: [{ Key: 'books/one.epub', Size: 100, LastModified: new Date('2024-01-01T00:00:00Z') }],
      })
      .mockResolvedValueOnce({
        IsTruncated: false,
        Contents: [{ Key: 'books/two.epub', Size: 200, LastModified: new Date('2024-01-02T00:00:00Z') }],
      });

    await expect(provider.listFiles('books', true)).resolves.toEqual([
      { key: 'books/one.epub', fileName: 'one.epub', size: 100, updatedAt: new Date('2024-01-01T00:00:00Z') },
      { key: 'books/two.epub', fileName: 'two.epub', size: 200, updatedAt: new Date('2024-01-02T00:00:00Z') },
    ]);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
