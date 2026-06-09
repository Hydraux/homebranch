import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { mockBookEntity } from './bookMocks';

export const mockAddBookToBookShelfRequest = {
  bookShelfId: 'bookshelf-123',
  bookId: 'book-456',
};

export const mockBookShelf: BookShelfEntity = {
  id: 'bookshelf-123',
  title: 'Test Book Shelf',
  createdByUserId: undefined,
  books: [],
};

export const mockBookShelfWithBooks: BookShelfEntity = {
  id: 'bookshelf-with-books',
  title: 'My Favorites',
  createdByUserId: undefined,
  books: [mockBookEntity],
};
