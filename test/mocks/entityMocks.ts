import { BookEntity } from 'src/modules/book/book.entity';
import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { SavedPositionEntity } from 'src/modules/saved-position/saved-position.entity';
import { mockBook } from './bookMocks';
import { mockBookShelf } from './bookShelfMocks';
import { mockSavedPosition } from './savedPositionMocks';

/**
 * Database Entity Mocks - Used for persistence layer testing and mapper tests
 * These are derived from the domain entity mocks above
 */

export const mockBookEntity: BookEntity = {
  id: mockBook.id,
  title: mockBook.title,
  author: mockBook.author,
  fileName: mockBook.fileName,
  isFavorite: mockBook.isFavorite,
  genres: mockBook.genres,
  publishedYear: mockBook.publishedYear,
  coverImageFileName: mockBook.coverImageFileName,
  summary: mockBook.summary,
  uploadedByUserId: mockBook.uploadedByUserId,
  series: mockBook.series,
  seriesPosition: mockBook.seriesPosition,
  isbn: mockBook.isbn,
  pageCount: mockBook.pageCount,
  publisher: mockBook.publisher,
  language: mockBook.language,
  averageRating: mockBook.averageRating,
  ratingsCount: mockBook.ratingsCount,
  metadataFetchedAt: mockBook.metadataFetchedAt,
  createdAt: new Date('2024-01-01'),
};

export const mockBookShelfEntity: BookShelfEntity = {
  id: mockBookShelf.id,
  title: mockBookShelf.title,
  createdByUserId: mockBookShelf.createdByUserId,
  books: mockBookShelf.books,
};

export const mockSavedPositionEntity: SavedPositionEntity = {
  bookId: mockSavedPosition.bookId,
  userId: mockSavedPosition.userId,
  position: mockSavedPosition.position,
  deviceName: mockSavedPosition.deviceName,
  percentage: mockSavedPosition.percentage,
  createdAt: mockSavedPosition.createdAt,
  updatedAt: mockSavedPosition.updatedAt,
};

/**
 * Entity variants with different field values for testing edge cases
 */

export const mockBookEntityWithAllFields: BookEntity = {
  ...mockBookEntity,
  publishedYear: 2023,
  coverImageFileName: 'cover.jpg',
};

export const mockBookEntityWithoutOptional: BookEntity = {
  ...mockBookEntity,
  publishedYear: undefined,
  coverImageFileName: undefined,
};

export const mockBookShelfEntityWithBooks: BookShelfEntity = {
  ...mockBookShelfEntity,
  books: [mockBookEntity],
};

export const mockBookShelfEntityEmpty: BookShelfEntity = {
  ...mockBookShelfEntity,
  books: [],
};
