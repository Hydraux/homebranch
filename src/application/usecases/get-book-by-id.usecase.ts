import { Inject, Injectable } from '@nestjs/common';
import { IBookRepository } from '../interfaces/book-repository';
import { Book } from 'src/domain/entities/book.entity';
import { BookNotFoundError } from 'src/domain/exceptions/book.exceptions';

@Injectable()
export class GetBookByIdUseCase {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute(id: string): Promise<Book> {
    const book = await this.bookRepository.findById(id);

    if (!book) {
      throw new BookNotFoundError();
    }

    return book;
  }
}
