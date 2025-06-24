import { Inject, Injectable } from '@nestjs/common';
import { IBookRepository } from '../interfaces/book-repository';
import { UseCase } from '../interfaces/usecase';
import { Book } from 'src/domain/entities/book.entity';

@Injectable()
export class GetBooksUseCase implements UseCase<void, Book[]> {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute(): Promise<Book[]> {
    try {
      const books = await this.bookRepository.findAll();
      return books;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error('Error fetching books: ' + error.message);
    }
  }
}
