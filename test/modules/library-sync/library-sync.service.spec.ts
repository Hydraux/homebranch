import { NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { LibrarySyncService } from 'src/modules/library-sync/library-sync.service';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook } from 'test/mocks/bookMocks';

describe('LibrarySyncService', () => {
  let service: LibrarySyncService;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;
  let libraryScanQueue: { enqueueScan: jest.Mock };
  let fileProcessingQueue: { enqueueMetadataSync: jest.Mock };

  beforeEach(() => {
    process.env.UPLOADS_DIRECTORY = 'C:\\library';

    bookPersistenceService = {
      findBookById: jest.fn(),
      findOrphanedBooks: jest.fn(),
      findUnownedBooks: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;
    libraryScanQueue = { enqueueScan: jest.fn() };
    fileProcessingQueue = { enqueueMetadataSync: jest.fn() };
    service = new LibrarySyncService(libraryScanQueue as never, fileProcessingQueue as never, bookPersistenceService);
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIRECTORY;
    jest.clearAllMocks();
  });

  test('enqueues a manual library scan for the books directory', async () => {
    libraryScanQueue.enqueueScan.mockResolvedValueOnce({ jobId: 'scan-1' });

    await expect(service.triggerScan()).resolves.toEqual({ jobId: 'scan-1' });
    expect(libraryScanQueue.enqueueScan).toHaveBeenCalledWith(join('C:\\library', 'books'));
  });

  test('enqueues a manual metadata sync with the book file details', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);
    fileProcessingQueue.enqueueMetadataSync.mockResolvedValueOnce({ jobId: 'sync-1' });

    await expect(service.triggerBookMetadataSync(mockBook.id)).resolves.toEqual({ jobId: 'sync-1' });
    expect(fileProcessingQueue.enqueueMetadataSync).toHaveBeenCalledWith(
      mockBook.id,
      mockBook.fileName,
      join('C:\\library', 'books', mockBook.fileName),
      { jobId: `sync-${mockBook.id}-manual` },
    );
  });

  test('passes through unowned and orphaned queries', async () => {
    bookPersistenceService.findUnownedBooks.mockResolvedValueOnce({
      data: [mockBook],
      total: 1,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });
    bookPersistenceService.findOrphanedBooks.mockResolvedValueOnce({
      data: [mockBook],
      total: 1,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });

    await expect(service.getUnownedBooks()).resolves.toEqual({
      data: [mockBook],
      total: 1,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });
    await expect(service.getOrphanedBooks(['user-1'])).resolves.toEqual({
      data: [mockBook],
      total: 1,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });
  });

  test('throws when the requested book cannot be found', async () => {
    bookPersistenceService.findBookById.mockRejectedValueOnce(new NotFoundException('Book not found'));

    await expect(service.triggerBookMetadataSync('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
