import { Inject, Injectable } from "@nestjs/common";
import { IBookRepository } from "../interfaces/book-repository";

@Injectable()
export class GetBooksUseCase {
  constructor(@Inject('BookRepository') private bookRepository: IBookRepository) {}

  async execute(): Promise<any[]> {
    try {
      const books = await this.bookRepository.findAll();
      return books;
    } catch (error) {
      throw new Error('Error fetching books: ' + error.message);
    }
  }
}