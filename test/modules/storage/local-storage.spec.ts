import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import LocalStorage from 'src/modules/storage/local-storage';

describe('LocalStorage', () => {
  let provider: LocalStorage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorage,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? key),
          },
        },
      ],
    }).compile();

    provider = module.get<LocalStorage>(LocalStorage);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
