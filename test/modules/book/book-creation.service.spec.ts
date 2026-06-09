import { BadRequestException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { BookFormatProcessingService } from 'src/modules/book/format/book-format-processing.service';
import { FileService } from 'src/modules/book/format/file.service';
import { BookCreationService } from 'src/modules/book/catalog/book-creation.service';
import { BookDuplicateRegistrationService } from 'src/modules/book/deduplication/book-duplicate-registration.service';
import { CompositeMetadataGateway } from 'src/modules/book/metadata/gateways/composite-metadata.gateway';
import { Book } from 'src/modules/book/book.model';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook } from 'test/mocks/bookMocks';

describe('BookCreationService', () => {
  let service: BookCreationService;
  let duplicateRegistrationService: ReturnType<typeof mock<BookDuplicateRegistrationService>>;
  let metadataGateway: ReturnType<typeof mock<CompositeMetadataGateway>>;
  let contentHashService: ReturnType<typeof mock<ContentHashService>>;
  let fileService: ReturnType<typeof mock<FileService>>;
  let bookFormatProcessingService: ReturnType<typeof mock<BookFormatProcessingService>>;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;

  beforeEach(() => {
    duplicateRegistrationService = mock<BookDuplicateRegistrationService>();
    metadataGateway = mock<CompositeMetadataGateway>();
    contentHashService = mock<ContentHashService>();
    fileService = mock<FileService>();
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
      fileService,
      bookFormatProcessingService,
      bookPersistenceService,
    );

    metadataGateway.enrichBook.mockResolvedValue(mockBook);
    bookFormatProcessingService.parseMetadata.mockResolvedValue({});
    fileService.fileExists.mockReturnValue(false);
    fileService.writeFile.mockResolvedValue(undefined);
    fileService.moveFile.mockResolvedValue(undefined);
    fileService.deleteFile.mockResolvedValue(undefined);
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
      fileName: 'test-book.epub',
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
    fileService.fileExists.mockImplementation((filePath) => filePath.includes('incoming'));

    const result = await service.createBook({
      title: 'Test Book',
      author: 'Test Author',
      fileName: 'test-book.epub',
      uploadedByUserId: 'user-123',
    });

    expect(result).toEqual({ skipped: true, existingBook: mockBook });
    expect(bookPersistenceService.createBookRecord).not.toHaveBeenCalled();
    expect(fileService.deleteFile).toHaveBeenCalled();
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
      fileName: 'fresh-upload.pdf',
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
        fileName: '.epub',
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
        fileName: 'test-book.epub',
        uploadedByUserId: 'user-123',
      }),
    ).rejects.toThrow('Database error');
  });
});
