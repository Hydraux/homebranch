import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { BookDuplicateController } from 'src/modules/book/deduplication/book-duplicate.controller';
import { BookDuplicateService } from 'src/modules/book/deduplication/book-duplicate.service';

describe('BookDuplicateController (e2e)', () => {
  let app: INestApplication<App>;

  const mockBookDuplicateService = {
    listDuplicates: jest.fn(),
    triggerScan: jest.fn(),
    resolveDuplicate: jest.fn(),
  };

  const authGuard = {
    canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
      context.switchToHttp().getRequest().user = { id: 'admin-1', roles: ['ADMIN'] };
      return true;
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BookDuplicateController],
      providers: [{ provide: BookDuplicateService, useValue: mockBookDuplicateService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(RolesGuard)
      .useValue(authGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  test('lists duplicates with a plain response payload', async () => {
    mockBookDuplicateService.listDuplicates.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 10,
      offset: 0,
      nextCursor: null,
    });

    const response = await request(app.getHttpServer()).get('/books/duplicates?limit=10').expect(200);

    expect(response.body.total).toBe(0);
    expect(mockBookDuplicateService.listDuplicates).toHaveBeenCalledWith(10, undefined);
  });

  test('triggers a duplicate scan with a plain response payload', async () => {
    mockBookDuplicateService.triggerScan.mockResolvedValueOnce({ message: 'Duplicate scan job enqueued' });

    const response = await request(app.getHttpServer()).post('/books/duplicates/scan').expect(202);

    expect(response.body.message).toBe('Duplicate scan job enqueued');
  });

  test('resolves a duplicate with a plain response payload', async () => {
    mockBookDuplicateService.resolveDuplicate.mockResolvedValueOnce({ id: 'dup-1' });

    const response = await request(app.getHttpServer())
      .post('/books/duplicates/dup-1/resolve')
      .send({ action: 'keep_both' })
      .expect(201);

    expect(response.body.id).toBe('dup-1');
    expect(mockBookDuplicateService.resolveDuplicate).toHaveBeenCalledWith('dup-1', 'keep_both', 'admin-1');
  });
});
