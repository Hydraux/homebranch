import { Book, copyBook } from 'src/modules/book/book.model';

describe('Book', () => {
  test('creates a book with defaults', () => {
    const book = new Book('book-1', 'Test Book', 'Test Author', 'test.epub');

    expect(book.id).toBe('book-1');
    expect(book.isFavorite).toBe(false);
    expect(book.genres).toEqual([]);
  });

  test('throws when title is missing', () => {
    expect(() => new Book('book-1', '', 'Author', 'test.epub')).toThrow(
      'Title and author are required to create a book.',
    );
  });

  test('creates a copy with overrides', () => {
    const book = new Book('book-1', 'Title', 'Author', 'test.epub', false, []);

    const updated = copyBook(book, { title: 'Updated Title', isFavorite: true });

    expect(updated.title).toBe('Updated Title');
    expect(updated.isFavorite).toBe(true);
    expect(updated.author).toBe('Author');
    expect(book.title).toBe('Title');
  });
});
