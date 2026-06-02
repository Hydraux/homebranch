import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaginationResult } from 'src/common/core/pagination_result';
import { Book } from 'src/modules/book/book.model';
import { BookService } from 'src/modules/book/catalog/book.service';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { mockBook, mockBookFavorite } from 'test/mocks/bookMocks';

describe('BookService', () => {
  let service: BookService;
  let bookPersistenceService: jest.Mocked<BookPersistenceService>;
  let metadataGateway: { enrichBook: jest.Mock };
  let summaryGateway: { fetchSummary: jest.Mock };

  beforeEach(() => {
    bookPersistenceService = {
      searchBooksWithFilters: jest.fn(),
      findBooks: jest.fn(),
      findFavoriteBooks: jest.fn(),
      searchFavoriteBooksWithFilters: jest.fn(),
      findBookById: jest.fn(),
      toggleBookFavorite: jest.fn(),
      permanentDeleteBook: jest.fn(),
      updateBookRecord: jest.fn(),
      findNewArrivals: jest.fn(),
    } as unknown as jest.Mocked<BookPersistenceService>;
    metadataGateway = { enrichBook: jest.fn() };
    summaryGateway = { fetchSummary: jest.fn() };

    service = new BookService(bookPersistenceService, metadataGateway as never, summaryGateway as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('lists books through filtered search when filters are present', async () => {
    const paginationResult: PaginationResult<Book[]> = {
      data: [mockBook],
      total: 1,
      limit: 10,
      offset: 5,
      nextCursor: null,
    };
    bookPersistenceService.searchBooksWithFilters.mockResolvedValueOnce(paginationResult);

    await expect(
      service.getBooks({ query: 'Test', limit: 10, offset: 5, userId: 'user-1', viewerUserId: 'viewer-1' }),
    ).resolves.toEqual(paginationResult);
  });

  test('lists favorite books without filters through favorite query helper', async () => {
    const paginationResult: PaginationResult<Book[]> = {
      data: [{ ...mockBook, isFavorite: true }],
      total: 1,
      limit: 20,
      offset: 0,
      nextCursor: null,
    };
    bookPersistenceService.findFavoriteBooks.mockResolvedValueOnce(paginationResult);

    await expect(service.getFavoriteBooks({ userId: 'user-1', limit: 20, offset: 0 })).resolves.toEqual(
      paginationResult,
    );
  });

  test('gets a single book by id', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);

    await expect(service.getBookById(mockBook.id, 'viewer-1')).resolves.toEqual(mockBook);
  });

  test('toggles a favorite book', async () => {
    bookPersistenceService.toggleBookFavorite.mockResolvedValueOnce({ isFavorite: true });

    await expect(service.toggleFavorite('user-1', mockBook.id)).resolves.toEqual({ isFavorite: true });
  });

  test('deletes a book for its owner', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);
    bookPersistenceService.permanentDeleteBook.mockResolvedValueOnce(mockBook);

    await expect(service.deleteBook(mockBook.id, mockBook.uploadedByUserId!, false)).resolves.toEqual(mockBook);
  });

  test('blocks deletion for a different non-admin user', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);

    await expect(service.deleteBook(mockBook.id, 'other-user', false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookPersistenceService.permanentDeleteBook).not.toHaveBeenCalled();
  });

  test('assigns a book owner for an admin', async () => {
    const updatedBook = { ...mockBook, uploadedByUserId: 'user-999' };
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);
    bookPersistenceService.updateBookRecord.mockResolvedValueOnce(updatedBook);

    await expect(service.assignBookOwner(mockBook.id, 'user-999', true)).resolves.toEqual(updatedBook);
  });

  test('enriches and persists metadata', async () => {
    const enrichedBook = { ...mockBook, genres: ['Fiction'] };
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);
    metadataGateway.enrichBook.mockResolvedValueOnce(enrichedBook);
    bookPersistenceService.updateBookRecord.mockResolvedValueOnce(enrichedBook);

    await expect(service.fetchBookMetadata(mockBook.id)).resolves.toEqual(enrichedBook);
    expect(metadataGateway.enrichBook).toHaveBeenCalledWith(mockBook);
  });

  test('returns the existing book when no summary is found', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBookFavorite);
    summaryGateway.fetchSummary.mockResolvedValueOnce(null);

    await expect(service.fetchBookSummary(mockBookFavorite.id)).resolves.toEqual(mockBookFavorite);
    expect(bookPersistenceService.updateBookRecord).not.toHaveBeenCalled();
  });

  test('returns download information for the preferred book format', async () => {
    bookPersistenceService.findBookById.mockResolvedValueOnce(mockBook);

    await expect(service.getDownload(mockBook.id)).resolves.toEqual({
      book: mockBook,
      format: BookFormatType.EPUB,
      fileName: mockBook.fileName,
    });
  });

  test('surfaces not found errors from the lookup helper', async () => {
    bookPersistenceService.findBookById.mockRejectedValueOnce(new NotFoundException('Book not found'));

    await expect(service.getBookById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  test('surfaces unexpected list errors', async () => {
    bookPersistenceService.findBooks.mockRejectedValueOnce(new Error('Database error'));

    await expect(service.getBooks({})).rejects.toThrow('Database error');
  });
});
