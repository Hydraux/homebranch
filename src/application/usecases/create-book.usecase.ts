import { Inject, Injectable } from "@nestjs/common";
import { CreateBookRequest } from "../contracts/create-book-request";
import { IBookRepository } from "../interfaces/book-repository";
import { UseCase } from "../interfaces/usecase";
import { BookFactory } from "src/domain/entities/book.factory";
import { Book } from "src/domain/entities/book.entity";


@Injectable()
export class CreateBookUseCase implements UseCase<CreateBookRequest, Book> {
    constructor(@Inject('BookRepository') private bookRepository: IBookRepository) {}

    async execute(dto: CreateBookRequest): Promise<Book> {
        const book = BookFactory.create(
            dto.title,
            dto.author,
            dto.publishedYear,
            dto.genre
        );
        this.bookRepository.save(book);
        return book;
    }
}