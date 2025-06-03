import { Book } from "src/domain/entities/book.entity";
import { IRepository } from "./repository";

export interface IBookRepository extends IRepository<Book> {
    findByAuthor(authorId: string): Promise<Book[]>;
    findByGenre(genre: string): Promise<Book[]>;
    findByTitle(title: string): Promise<Book | null>;
}