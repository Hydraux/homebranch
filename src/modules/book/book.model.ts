import { BookEntity } from 'src/modules/book/book.entity';

export { BookEntity as Book };

export function copyBook(book: BookEntity, overrides: Partial<BookEntity> = {}): BookEntity {
  const copiedBook = Object.assign(new BookEntity(), book);
  Reflect.deleteProperty(copiedBook, 'bookShelves');

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      Object.assign(copiedBook, { [key]: value });
    }
  }

  return copiedBook;
}
