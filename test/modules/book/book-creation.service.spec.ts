import { BadRequestException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { BookFormatProcessingService } from 'src/modules/book/format/book-format-processing.service';
import { BookCreationService } from 'src/modules/book/catalog/book-creation.service';
import { BookDuplicateRegistrationService } from 'src/modules/book/deduplication/book-duplicate-registration.service';
import { CompositeMetadataGateway } from 'src/modules/book/metadata/gateways/composite-metadata.gateway';
import { Book } from 'src/modules/book/book.model';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook } from 'test/mocks/bookMocks';
import { IStorageService } from 'src/modules/storage/storage.interface';

describe('BookCreationService', () => {
  let service: BookCreationService;
  let duplicateRegistrationService: ReturnType<typeof mock<BookDuplicateRegistrationService>>;
  let metadataGateway: ReturnType<typeof mock<CompositeMetadataGateway>>;
  let contentHashService: ReturnType<typeof mock<ContentHashService>>;
  let storage: ReturnType<typeof mock<IStorageService>>;
  let bookFormatProcessingService: ReturnType<typeof mock<BookFormatProcessingService>>;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;

  beforeEach(() => {
    duplicateRegistrationService = mock<BookDuplicateRegistrationService>();
    metadataGateway = mock<CompositeMetadataGateway>();
    contentHashService = mock<ContentHashService>();
    storage = mock<IStorageService>();
    bookFormatProcessingService = mock<BookFormatProcessingService>();
    bookPersistenceService = {
      findBookByContentHash: jest.fn(),
      findBookById: jest.fn(),
      searchBooksWithFilters: jest.fn(),
      searchBooksByAuthorAndTitle: jest.fn(),
      updateBookRecord: jest.fn(),
      createBookRecord: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;

    service = new BookCreationService(
      duplicateRegistrationService,
      metadataGateway,
      contentHashService,
      bookFormatProcessingService,
      bookPersistenceService,
      storage,
    );

    metadataGateway.enrichBook.mockResolvedValue(mockBook);
    bookFormatProcessingService.parseMetadata.mockResolvedValue({});
    storage.exists.mockResolvedValue(false);
    storage.uploadFile.mockResolvedValue({ key: 'some-key', url: 'some-url' });
    storage.moveFile.mockResolvedValue(undefined);
    storage.deleteFile.mockResolvedValue(undefined);
    bookPersistenceService.findBookByContentHash.mockResolvedValue(null);
    bookPersistenceService.findBookById.mockRejectedValue(new Error('Book not found'));
    bookPersistenceService.searchBooksWithFilters.mockResolvedValue({
      data: [],
      limit: 10,
      offset: 0,
      total: 0,
      nextCursor: null,
    });
    bookPersistenceService.searchBooksByAuthorAndTitle.mockResolvedValue({
      data: [],
      limit: 10,
      offset: 0,
      total: 0,
      nextCursor: null,
    });
    contentHashService.computeHash.mockResolvedValue('abc123hash');
    duplicateRegistrationService.flagPotentialDuplicate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('creates a book and kicks off background enrichment', async () => {
    bookPersistenceService.createBookRecord.mockResolvedValueOnce(mockBook);
    bookPersistenceService.updateBookRecord.mockResolvedValueOnce(mockBook);

    const result = await service.createBook({
      title: 'Test Book',
      author: 'Test Author',
      filePath: '/tmp/uploads/test-book.epub',
      uploadedByUserId: 'user-123',
    });

    expect(result).toEqual(mockBook);
    expect(bookPersistenceService.createBookRecord).toHaveBeenCalled();

    await new Promise((resolve) => setImmediate(resolve));
    expect(metadataGateway.enrichBook).toHaveBeenCalledWith(mockBook);
    expect(bookPersistenceService.updateBookRecord).toHaveBeenCalled();
  });

  test('returns skipped response for an exact duplicate', async () => {
    bookPersistenceService.findBookByContentHash.mockResolvedValueOnce(mockBook);

    const result = await service.createBook({
      title: 'Test Book',
      author: 'Test Author',
      filePath: '/tmp/uploads/test-book.epub',
      uploadedByUserId: 'user-123',
    });

    expect(result).toEqual({ skipped: true, existingBook: mockBook });
    expect(bookPersistenceService.createBookRecord).not.toHaveBeenCalled();
    expect(storage.deleteFile).toHaveBeenCalled();
  });

  test('attaches a new format to an existing logical book', async () => {
    const existingBook = new Book(
      'book-epub',
      'Shared Title',
      'Shared Author',
      'Shared Author - Shared Title.epub',
      false,
      [],
    );
    existingBook.uploadedByUserId = 'user-123';
    existingBook.formats = [
      Object.assign(new BookFormatEntity(), {
        id: 'format-epub',
        format: BookFormatType.EPUB,
        fileName: 'Shared Author - Shared Title.epub',
        fileContentHash: 'epub-hash',
      }),
    ];

    bookPersistenceService.searchBooksByAuthorAndTitle.mockResolvedValueOnce({
      data: [existingBook],
      limit: 10,
      offset: 0,
      total: 1,
      nextCursor: null,
    });
    bookPersistenceService.findBookById.mockResolvedValueOnce(existingBook);
    bookPersistenceService.updateBookRecord.mockImplementationOnce((_id, book) => Promise.resolve(book));

    const result = await service.createBook({
      title: 'Shared Title',
      author: 'Shared Author',
      filePath: '/tmp/uploads/fresh-upload.pdf',
      uploadedByUserId: 'user-123',
    });

    expect(result).toEqual(
      expect.objectContaining({
        formats: expect.arrayContaining([
          expect.objectContaining({ format: BookFormatType.EPUB }),
          expect.objectContaining({ format: BookFormatType.PDF }),
        ]),
      }),
    );
    expect(bookPersistenceService.createBookRecord).not.toHaveBeenCalled();
  });

  test('throws bad request when title cannot be determined', async () => {
    await expect(
      service.createBook({
        title: '' as never,
        author: 'Test Author',
        filePath: '/tmp/uploads/.epub',
        uploadedByUserId: 'user-123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('surfaces persistence create failures', async () => {
    bookPersistenceService.createBookRecord.mockRejectedValueOnce(new Error('Database error'));

    await expect(
      service.createBook({
        title: 'Test Book',
        author: 'Test Author',
        filePath: '/tmp/uploads/test-book.epub',
        uploadedByUserId: 'user-123',
      }),
    ).rejects.toThrow('Database error');
  });
});
