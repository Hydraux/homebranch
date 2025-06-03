import { Book } from "src/domain/entities/book.entity";
import { BookEntity } from "../database/book.entity";

export class BookMapper {
    static toDomain(bookEntity: BookEntity): Book {
        return new Book(
            bookEntity.id,
            bookEntity.title,
            bookEntity.author,
            bookEntity.publishedYear,
            bookEntity.genre,
        );
    }

    static toPersistence(book: Book): BookEntity {
        return {
            id: book.id,
            title: book.title,
            author: book.author,
            publishedYear: book.publishedYear,
            genre: book.genre,
        };
    }

    static toDomainList(bookEntityList: BookEntity[]): Book[] {
        return bookEntityList.map(bookEntity => this.toDomain(bookEntity));
    }
}