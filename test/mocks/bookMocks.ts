import { Book } from 'src/modules/book/book.model';
import { BookEntity } from 'src/modules/book/book.entity';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';

const mockBookFormat = Object.assign(new BookFormatEntity(), {
  id: 'format-456',
  format: BookFormatType.EPUB,
  fileName: 'test-book.epub',
});

export const mockBook: Book = new Book(
  'book-456',
  'Test Book',
  'Test Author',
  'test-book.epub',
  false,
  [],
  2001,
  'test-cover.jpg',
  'A test book summary.',
  'user-123',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  [mockBookFormat],
);

const mockBookFavoriteFormat = Object.assign(new BookFormatEntity(), {
  id: 'format-fav',
  format: BookFormatType.EPUB,
  fileName: 'favorite-book.epub',
});

export const mockBookFavorite: Book = new Book(
  'book-fav',
  'Favorite Book',
  'Famous Author',
  'favorite-book.epub',
  true,
  [],
  2023,
  'favorite-cover.jpg',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  [mockBookFavoriteFormat],
);

export const mockBookEntity: BookEntity = {
  id: 'book-456',
  title: 'Test Book',
  author: 'Test Author',
  fileName: 'test-book.epub',
  isFavorite: false,
  genres: [],
  publishedYear: 2001,
  coverImageFileName: 'test-cover.jpg',
  summary: 'A test book summary.',
  uploadedByUserId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};
