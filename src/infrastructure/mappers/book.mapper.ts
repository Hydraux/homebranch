import { Book } from 'src/domain/entities/book.entity';
import { BookEntity } from '../database/book.entity';
import { BookFactory } from 'src/domain/entities/book.factory';

export class BookMapper {
  static toDomain(bookEntity: BookEntity): Book {
    return BookFactory.create(
      bookEntity.id,
      bookEntity.title,
      bookEntity.author,
      bookEntity.fileName,
      bookEntity.isFavorited,
      bookEntity.publishedYear,
      bookEntity.coverImageFileName,
    );
  }

  static toPersistence(book: Book): BookEntity {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      fileName: book.fileName,
      isFavorited: book.isFavorited,
      publishedYear: book.publishedYear,
      coverImageFileName: book.coverImageFileName,
    };
  }

  static toDomainList(bookEntityList: BookEntity[]): Book[] {
    return bookEntityList.map((bookEntity) => this.toDomain(bookEntity));
  }
}
