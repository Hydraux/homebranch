import { Book } from './book.entity';

export class BookFactory {
  static create(
    id: string,
    title: string,
    author: string,
    fileName: string,
    isFavorited: boolean = false,
    publishedYear?: number,
    coverImageFileName?: string,
  ): Book {
    if (!title || !author) {
      throw new Error('Title and author are required to create a book.');
    }

    return new Book(
      id,
      title,
      author,
      fileName,
      isFavorited,
      publishedYear,
      coverImageFileName,
    );
  }
}
