import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { LibrarySyncController } from 'src/modules/library-sync/library-sync.controller';
import { LibraryEventsService } from 'src/modules/library-sync/library-events.service';
import { LibrarySyncService } from 'src/modules/library-sync/library-sync.service';
import { of } from 'rxjs';

describe('LibrarySyncController (e2e)', () => {
  let app: INestApplication<App>;

  const mockLibrarySyncService = {
    triggerScan: jest.fn(),
    triggerBookMetadataSync: jest.fn(),
    getUnownedBooks: jest.fn(),
    getOrphanedBooks: jest.fn(),
  };

  const mockLibraryEventsService = {
    getStream: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LibrarySyncController],
      providers: [
        { provide: LibrarySyncService, useValue: mockLibrarySyncService },
        { provide: LibraryEventsService, useValue: mockLibraryEventsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  test('triggers a scan with a plain response payload', async () => {
    mockLibrarySyncService.triggerScan.mockResolvedValueOnce({ jobId: 'scan-1' });

    const response = await request(app.getHttpServer()).post('/library/scan').expect(201);

    expect(response.body.jobId).toBe('scan-1');
    expect(mockLibrarySyncService.triggerScan).toHaveBeenCalledWith();
  });

  test('triggers a metadata sync with a plain response payload', async () => {
    mockLibrarySyncService.triggerBookMetadataSync.mockResolvedValueOnce({ jobId: 'sync-1' });

    const response = await request(app.getHttpServer()).post('/library/books/book-1/sync').expect(201);

    expect(response.body.jobId).toBe('sync-1');
    expect(mockLibrarySyncService.triggerBookMetadataSync).toHaveBeenCalledWith('book-1');
  });

  test('lists unowned books with plain response payload', async () => {
    mockLibrarySyncService.getUnownedBooks.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 10,
      offset: 5,
      nextCursor: null,
    });

    const response = await request(app.getHttpServer()).get('/library/unowned-books?limit=10&offset=5').expect(200);

    expect(response.body.total).toBe(0);
    expect(mockLibrarySyncService.getUnownedBooks).toHaveBeenCalledWith(10, 5);
  });

  test('lists orphaned books with defaults when pagination is omitted', async () => {
    mockLibrarySyncService.getOrphanedBooks.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });

    const response = await request(app.getHttpServer())
      .post('/library/orphaned-books')
      .send({ knownUserIds: ['user-1'] })
      .expect(201);

    expect(response.body.total).toBe(0);
    expect(mockLibrarySyncService.getOrphanedBooks).toHaveBeenCalledWith(['user-1'], 20, 0);
  });

  test('streams library events through the sse endpoint', async () => {
    mockLibraryEventsService.getStream.mockReturnValueOnce(of({ data: 'hello' }));

    await request(app.getHttpServer()).get('/library/events').expect(200);

    expect(mockLibraryEventsService.getStream).toHaveBeenCalled();
  });
});
