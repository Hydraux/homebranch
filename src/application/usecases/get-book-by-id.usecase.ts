import { Inject, Injectable } from "@nestjs/common";
import { IBookRepository } from "../interfaces/book-repository";
import { Book } from "src/domain/entities/book.entity";

@Injectable()
export class GetBookByIdUseCase{
  constructor(@Inject('BookRepository') private bookRepository: IBookRepository) {}

  async execute(id: string): Promise<Book> {
    try {
      const book = await this.bookRepository.findById(id); // TODO: This could be improved to only find a single book

      if(!book) {
        throw new Error(`Book with id ${id} not found`);
      }
      
      return book;
    } catch (error) {
      throw new Error('Error fetching books: ' + error.message);
    }
  }
}