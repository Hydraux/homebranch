import { Job } from 'bullmq';
import { mock } from 'jest-mock-extended';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { Book } from 'src/modules/book/book.model';
import { DuplicateScanProcessor } from 'src/modules/book/deduplication/duplicate-scan.processor';
import { BookDuplicatePersistenceService } from 'src/modules/book/deduplication/book-duplicate.persistence';
import { BookDuplicateEntity } from 'src/modules/book/deduplication/book-duplicate.entity';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

const HASH_A = 'hash-abc';
const HASH_B = 'hash-xyz';

function makeBook(overrides: Partial<Book> & { id: string }): Book {
  return new Book(
    overrides.id,
    overrides.title ?? 'Default Title',
    overrides.author ?? 'Default Author',
    overrides.fileName ?? 'file.epub',
    overrides.isFavorite ?? false,
    overrides.genres ?? [],
    overrides.publishedYear,
    overrides.coverImageFileName,
    overrides.summary,
    overrides.uploadedByUserId,
    overrides.series,
    overrides.seriesPosition,
    overrides.isbn,
    overrides.pageCount,
    overrides.publisher,
    overrides.language,
    overrides.averageRating,
    overrides.ratingsCount,
    overrides.metadataFetchedAt,
    overrides.createdAt ?? new Date('2026-01-01'),
    overrides.deletedAt,
    overrides.lastSyncedAt,
    overrides.syncedMetadata,
    overrides.fileMtime,
    overrides.fileContentHash,
  );
}

const mockUpdateProgress = jest.fn().mockResolvedValue(undefined);
const scanJob = { name: 'scan-duplicates', updateProgress: mockUpdateProgress } as unknown as Job;
const unknownJob = { name: 'unknown-job', updateProgress: mockUpdateProgress } as unknown as Job;

describe('DuplicateScanProcessor', () => {
  let processor: DuplicateScanProcessor;
  let contentHashService: ReturnType<typeof mock<ContentHashService>>;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;
  let duplicatePersistenceService: jest.Mocked<BookDuplicatePersistenceService>;

  beforeEach(() => {
    contentHashService = mock<ContentHashService>();
    contentHashService.computeHash.mockResolvedValue(HASH_A);
    bookPersistenceService = {
      findAllActiveBooks: jest.fn(),
      updateStoredBookContentHash: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;
    duplicatePersistenceService = {
      createBookDuplicate: jest.fn(),
      findBookDuplicateByBookIds: jest.fn(),
    } as unknown as jest.Mocked<BookDuplicatePersistenceService>;

    bookPersistenceService.updateStoredBookContentHash.mockResolvedValue(undefined);
    processor = new DuplicateScanProcessor(bookPersistenceService, duplicatePersistenceService, contentHashService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockUpdateProgress.mockClear();
  });

  test('does nothing for unknown job names', async () => {
    await processor.process(unknownJob);

    expect(bookPersistenceService.findAllActiveBooks).not.toHaveBeenCalled();
  });

  test('does nothing when loading active books fails', async () => {
    bookPersistenceService.findAllActiveBooks.mockRejectedValueOnce(new Error('Database error'));

    await processor.process(scanJob);

    expect(duplicatePersistenceService.createBookDuplicate).not.toHaveBeenCalled();
  });

  test('updates stale content hashes before grouping duplicates', async () => {
    const book = makeBook({ id: 'book-a', fileName: 'file.epub', fileContentHash: HASH_B });
    bookPersistenceService.findAllActiveBooks.mockResolvedValueOnce([book]);
    contentHashService.computeHash.mockResolvedValueOnce(HASH_A);

    await processor.process(scanJob);

    expect(bookPersistenceService.updateStoredBookContentHash).toHaveBeenCalledWith(book.id, HASH_A);
  });

  test('creates a duplicate record for a new matching pair', async () => {
    const bookA = makeBook({ id: 'book-a', title: 'Same Title', author: 'Same Author', fileContentHash: HASH_A });
    const bookB = makeBook({ id: 'book-b', title: 'Same Title', author: 'Same Author', fileContentHash: HASH_A });
    bookPersistenceService.findAllActiveBooks.mockResolvedValueOnce([bookA, bookB]);
    duplicatePersistenceService.findBookDuplicateByBookIds.mockResolvedValue(null);
    duplicatePersistenceService.createBookDuplicate.mockResolvedValueOnce({} as BookDuplicateEntity);

    await processor.process(scanJob);

    expect(duplicatePersistenceService.createBookDuplicate).toHaveBeenCalledTimes(1);
  });

  test('does not re-flag pairs already tracked in either direction', async () => {
    const bookA = makeBook({ id: 'book-a', title: 'Title A', author: 'Author', fileContentHash: HASH_A });
    const bookB = makeBook({ id: 'book-b', title: 'Title B', author: 'Author', fileContentHash: HASH_A });
    bookPersistenceService.findAllActiveBooks.mockResolvedValueOnce([bookA, bookB]);
    duplicatePersistenceService.findBookDuplicateByBookIds
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({} as BookDuplicateEntity);

    await processor.process(scanJob);

    expect(duplicatePersistenceService.createBookDuplicate).not.toHaveBeenCalled();
  });
});
