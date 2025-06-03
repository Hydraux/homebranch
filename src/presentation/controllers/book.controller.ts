import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CreateBookRequest } from "src/application/contracts/create-book-request";
import { DeleteBookRequest } from "src/application/contracts/delete-book-request";
import { UpdateBookRequest } from "src/application/contracts/update-book-request";
import { CreateBookUseCase } from "src/application/usecases/create-book.usecase";
import { DeleteBookUseCase } from "src/application/usecases/delete-book.usecase";
import { GetBooksUseCase } from "src/application/usecases/get-books.usecase";
import { UpdateBookUseCase } from "src/application/usecases/update-book.usecase";
import { UpdateBookDto } from "../dtos/update-book.dto";

@Controller('books')
export class BookController {
    constructor(
        private readonly getBooksUseCase: GetBooksUseCase,
        private readonly createBookUseCase: CreateBookUseCase,
        private readonly deleteBookUseCase: DeleteBookUseCase,
        private readonly updateBookUseCase: UpdateBookUseCase,
    ){}

    @Get()
    getBooks() {
        return this.getBooksUseCase.execute();
    }

    @Post()
    createBook(@Body() createBookRequest: CreateBookRequest) {
        return this.createBookUseCase.execute(createBookRequest);
    }

    @Delete()
    deleteBook(@Body() deleteBookDto: DeleteBookRequest) {
        return this.deleteBookUseCase.execute(deleteBookDto);
    }

    @Post(`:id`)
    updateBook(@Body() updateBookDto: UpdateBookDto, @Param('id') id: string) {
        const updateBookRequest: UpdateBookRequest = {
            id,
            ...updateBookDto,
        };
        return this.updateBookUseCase.execute(updateBookRequest);
    }
}