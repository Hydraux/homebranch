import { BookMutationService } from 'src/modules/book/catalog/book-mutation.service';
import { Book } from 'src/modules/book/book.model';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook } from 'test/mocks/bookMocks';

describe('BookMutationService', () => {
  let service: BookMutationService;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;
  let fileProcessingQueue: { enqueueMetadataSync: jest.Mock };
  let fileService: { writeFile: jest.Mock };
  let bookFormatProcessingService: { parseMetadata: jest.Mock };

  beforeEach(() => {
    process.env.UPLOADS_DIRECTORY = 'C:\\library';
    bookPersistenceService = {
      findBookById: jest.fn(),
      updateBookRecord: jest.fn(),
      permanentDeleteBook: jest.fn(),
      splitBookFormatRecord: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;
    fileProcessingQueue = { enqueueMetadataSync: jest.fn() };
    fileService = { writeFile: jest.fn() };
    bookFormatProcessingService = { parseMetadata: jest.fn() };

    service = new BookMutationService(
      bookPersistenceService,
      fileProcessingQueue as never,
      fileService as never,
      bookFormatProcessingService as never,
    );
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIRECTORY;
    jest.clearAllMocks();
  });

  test('updates a book and enqueues metadata sync', async () => {
    const updatedBook = { ...mockBook, title: 'Updated Title' };
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);
    bookPersistenceService.updateBookRecord.mockResolvedValueOnce(updatedBook);

    await expect(service.updateBook({ id: mockBook.id, title: 'Updated Title' })).resolves.toEqual(updatedBook);
    expect(fileProcessingQueue.enqueueMetadataSync).toHaveBeenCalledWith(
      mockBook.id,
      updatedBook.fileName,
      expect.stringMatching(new RegExp(`books[\\\\/]${updatedBook.fileName.replace('.', '\\.')}$`)),
      { jobId: `sync-${mockBook.id}` },
    );
  });

  test('links two books by merging formats and deleting the source', async () => {
    const target = new Book('target', 'Shared', 'Author', 'shared.epub', false, []);
    target.uploadedByUserId = 'user-123';
    target.formats = [
      Object.assign(new BookFormatEntity(), { id: 'epub', format: BookFormatType.EPUB, fileName: 'shared.epub' }),
    ];

    const source = new Book('source', 'Shared', 'Author', 'shared.pdf', false, []);
    source.uploadedByUserId = 'user-123';
    source.formats = [
      Object.assign(new BookFormatEntity(), { id: 'pdf', format: BookFormatType.PDF, fileName: 'shared.pdf' }),
    ];

    bookPersistenceService.findBookById.mockResolvedValueOnce(target).mockResolvedValueOnce(source);
    bookPersistenceService.updateBookRecord.mockImplementation((_id, book) => Promise.resolve(book));
    bookPersistenceService.permanentDeleteBook.mockResolvedValueOnce(source);

    const result = await service.linkBooks({
      targetBookId: 'target',
      sourceBookId: 'source',
      requestingUserId: 'user-123',
      requestingUserRole: 'USER',
    });

    expect(result.formats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ format: BookFormatType.EPUB }),
        expect.objectContaining({ format: BookFormatType.PDF }),
      ]),
    );
    expect(bookPersistenceService.permanentDeleteBook).toHaveBeenCalledWith('source');
  });

  test('unlinks a format into a split book', async () => {
    const linkedBook = new Book('book-1', 'Merged Title', 'Merged Author', 'linked.epub', true, ['Fantasy']);
    linkedBook.uploadedByUserId = 'user-123';
    linkedBook.formats = [
      Object.assign(new BookFormatEntity(), {
        id: 'format-epub',
        format: BookFormatType.EPUB,
        fileName: 'Linked.epub',
      }),
      Object.assign(new BookFormatEntity(), { id: 'format-pdf', format: BookFormatType.PDF, fileName: 'Original.pdf' }),
    ];

    bookPersistenceService.findBookById.mockResolvedValueOnce(linkedBook);
    bookPersistenceService.splitBookFormatRecord.mockImplementation((_id, updatedBook) => Promise.resolve(updatedBook));
    bookFormatProcessingService.parseMetadata.mockResolvedValueOnce({
      title: 'Original Title',
      author: 'Original Author',
      coverImageBuffer: Buffer.from('cover'),
    });
    fileService.writeFile.mockResolvedValueOnce(undefined);

    await expect(
      service.unlinkBookFormat({
        bookId: linkedBook.id,
        formatId: 'format-pdf',
        requestingUserId: 'user-123',
        requestingUserRole: 'USER',
      }),
    ).resolves.toEqual(expect.objectContaining({ fileName: 'Linked.epub' }));

    expect(bookPersistenceService.splitBookFormatRecord).toHaveBeenCalledTimes(1);
  });
});
