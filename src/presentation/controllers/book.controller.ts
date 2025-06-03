import { Controller, Get } from "@nestjs/common";
import { GetBooksUseCase } from "src/application/usecases/get-books.usecase";

@Controller('books')
export class BookController {
    constructor(
        private readonly getBooksUseCase: GetBooksUseCase,
    ){}

    @Get()
    getBooks() {
        return this.getBooksUseCase.execute();
    }
}