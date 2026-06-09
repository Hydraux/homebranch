import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookDuplicateEntity } from 'src/modules/book/deduplication/book-duplicate.entity';
import { BookDuplicateService } from 'src/modules/book/deduplication/book-duplicate.service';
import {
  BookDuplicatePersistenceService,
  BookDuplicateWithBooks,
} from 'src/modules/book/deduplication/book-duplicate.persistence';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook, mockBookFavorite } from 'test/mocks/bookMocks';

const unresolvedDuplicate = {
  id: 'dup-1',
  suspectBookId: mockBook.id,
  originalBookId: mockBookFavorite.id,
  detectedAt: new Date('2026-01-01'),
} as BookDuplicateEntity;

const resolvedDuplicate = {
  ...unresolvedDuplicate,
  resolvedAt: new Date('2026-01-02'),
  resolution: 'merge',
  resolvedByUserId: 'admin-1',
} as BookDuplicateEntity;

describe('BookDuplicateService', () => {
  let service: BookDuplicateService;
  let duplicatePersistenceService: jest.Mocked<BookDuplicatePersistenceService>;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;
  let duplicateScanQueue: { enqueueScan: jest.Mock };

  beforeEach(() => {
    duplicatePersistenceService = {
      listUnresolvedBookDuplicates: jest.fn(),
      findBookDuplicateById: jest.fn(),
      resolveBookDuplicate: jest.fn(),
    } as unknown as jest.Mocked<BookDuplicatePersistenceService>;
    bookPersistenceService = {
      permanentDeleteBook: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;
    duplicateScanQueue = { enqueueScan: jest.fn() };
    service = new BookDuplicateService(
      duplicatePersistenceService,
      bookPersistenceService,
      duplicateScanQueue as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('lists unresolved duplicates', async () => {
    const pagination = { data: [] as BookDuplicateWithBooks[], total: 0, limit: 10, offset: 0, nextCursor: null };
    duplicatePersistenceService.listUnresolvedBookDuplicates.mockResolvedValueOnce(pagination);

    await expect(service.listDuplicates(10, 0)).resolves.toEqual(pagination);
  });

  test('enqueues a duplicate scan', async () => {
    await expect(service.triggerScan()).resolves.toEqual({ message: 'Duplicate scan job enqueued' });
    expect(duplicateScanQueue.enqueueScan).toHaveBeenCalled();
  });

  test('resolves a duplicate by merging and deleting the suspect book', async () => {
    duplicatePersistenceService.findBookDuplicateById.mockResolvedValueOnce(unresolvedDuplicate);
    bookPersistenceService.permanentDeleteBook.mockResolvedValueOnce(mockBook);
    duplicatePersistenceService.resolveBookDuplicate.mockResolvedValueOnce(resolvedDuplicate);

    await expect(service.resolveDuplicate('dup-1', 'merge', 'admin-1')).resolves.toEqual(resolvedDuplicate);
    expect(bookPersistenceService.permanentDeleteBook).toHaveBeenCalledWith(unresolvedDuplicate.suspectBookId);
  });

  test('returns the existing duplicate when resolve returns null', async () => {
    duplicatePersistenceService.findBookDuplicateById.mockResolvedValueOnce(unresolvedDuplicate);
    bookPersistenceService.permanentDeleteBook.mockResolvedValueOnce(mockBook);
    duplicatePersistenceService.resolveBookDuplicate.mockResolvedValueOnce(null);

    await expect(service.resolveDuplicate('dup-1', 'merge', 'admin-1')).resolves.toEqual(unresolvedDuplicate);
  });

  test('throws conflict when a duplicate is already resolved', async () => {
    duplicatePersistenceService.findBookDuplicateById.mockResolvedValueOnce(resolvedDuplicate);

    await expect(service.resolveDuplicate('dup-1', 'merge', 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  test('throws not found when the duplicate is missing', async () => {
    duplicatePersistenceService.findBookDuplicateById.mockRejectedValueOnce(
      new NotFoundException('Book duplicate not found'),
    );

    await expect(service.resolveDuplicate('missing', 'merge', 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
