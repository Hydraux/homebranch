import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PaginationResult } from 'src/common/core/pagination_result';
import { CompositeMetadataGateway } from 'src/modules/book/metadata/gateways/composite-metadata.gateway';
import { CompositeSummaryGateway } from 'src/modules/book/metadata/gateways/composite-summary.gateway';
import { GetBooksRequest } from 'src/modules/book/dto/get-books-request';
import { Book } from 'src/modules/book/book.model';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { getDefaultBookFormatType, getRequestedBookFormatFromBook } from 'src/modules/book/format/book-format';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

export interface DownloadBookResult {
  book: Book;
  format: BookFormatType;
  fileName: string;
}

@Injectable()
export class BookService {
  constructor(
    private readonly bookPersistenceService: BookPersistenceService,
    private readonly metadataGateway: CompositeMetadataGateway,
    private readonly summaryGateway: CompositeSummaryGateway,
  ) {}

  async getBooks({
    limit,
    offset,
    query,
    userId,
    viewerUserId,
    isbn,
    genre,
    series,
    author,
  }: GetBooksRequest): Promise<PaginationResult<Book[]>> {
    const hasFilters = query || isbn || genre || series || author;

    if (hasFilters) {
      return this.bookPersistenceService.searchBooksWithFilters(
        { query, isbn, genre, series, author },
        limit,
        offset,
        userId,
        viewerUserId,
      );
    }

    return this.bookPersistenceService.findBooks(limit, offset, userId, viewerUserId);
  }

  async getNewArrivals(limit?: number, offset?: number): Promise<PaginationResult<Book[]>> {
    return this.bookPersistenceService.findNewArrivals(limit, offset);
  }

  async getFavoriteBooks({
    query,
    limit,
    offset,
    userId,
    isbn,
    genre,
    series,
    author,
  }: GetBooksRequest): Promise<PaginationResult<Book[]>> {
    const hasFilters = query || isbn || genre || series || author;

    if (hasFilters) {
      return this.bookPersistenceService.searchFavoriteBooksWithFilters(
        { query, isbn, genre, series, author },
        limit,
        offset,
        userId,
      );
    }

    return this.bookPersistenceService.findFavoriteBooks(limit, offset, userId);
  }

  async getBookById(id: string, viewerUserId?: string): Promise<Book> {
    return this.bookPersistenceService.findBookById(id, viewerUserId);
  }

  async toggleFavorite(userId: string, bookId: string): Promise<{ isFavorite: boolean }> {
    return this.bookPersistenceService.toggleBookFavorite(userId, bookId);
  }

  async deleteBook(id: string, requestingUserId: string, isAdmin: boolean): Promise<Book> {
    const book = await this.bookPersistenceService.findBookById(id);

    if (!isAdmin && book.uploadedByUserId !== undefined && book.uploadedByUserId !== requestingUserId) {
      throw new ForbiddenException('Only the uploader or an admin can delete this book');
    }

    return this.bookPersistenceService.permanentDeleteBook(id);
  }

  async assignBookOwner(id: string, ownerId: string | null, isAdmin: boolean): Promise<Book> {
    this.ensureAdmin(isAdmin);

    const book = await this.bookPersistenceService.findBookById(id);
    book.uploadedByUserId = ownerId ?? undefined;

    return this.bookPersistenceService.updateBookRecord(book.id, book);
  }

  async bulkAssignBookOwner(bookIds: string[], ownerId: string | null, isAdmin: boolean) {
    this.ensureAdmin(isAdmin);

    const results = await Promise.allSettled(bookIds.map((bookId) => this.assignBookOwner(bookId, ownerId, isAdmin)));
    const assigned = results.filter((result) => result.status === 'fulfilled').length;

    return {
      assigned,
      failed: results.length - assigned,
      total: results.length,
    };
  }

  async fetchBookMetadata(id: string): Promise<Book> {
    const book = await this.bookPersistenceService.findBookById(id);
    const enrichedBook = await this.metadataGateway.enrichBook(book);

    return this.bookPersistenceService.updateBookRecord(id, enrichedBook);
  }

  async fetchBookSummary(id: string): Promise<Book> {
    const book = await this.bookPersistenceService.findBookById(id);
    const summary = await this.summaryGateway.fetchSummary(book);

    if (!summary) {
      return book;
    }

    book.summary = summary;
    return this.bookPersistenceService.updateBookRecord(id, book);
  }

  async getDownload(id: string, format?: BookFormatType): Promise<DownloadBookResult> {
    const book = await this.bookPersistenceService.findBookById(id);
    const selectedFormat = getRequestedBookFormatFromBook(book, format);

    if (!selectedFormat) {
      throw new BadRequestException(`Format "${format ?? getDefaultBookFormatType()}" is not available for this book`);
    }

    return {
      book,
      format: selectedFormat.format,
      fileName: selectedFormat.fileName,
    };
  }

  private ensureAdmin(isAdmin: boolean): void {
    if (!isAdmin) {
      throw new ForbiddenException('Only an admin can assign a book owner');
    }
  }
}
