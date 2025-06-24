import { Book } from 'src/domain/entities/book.entity';
import { UpdateBookRequest } from '../contracts/update-book-request';
import { UseCase } from '../interfaces/usecase';
import { IBookRepository } from '../interfaces/book-repository';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UpdateBookUseCase implements UseCase<UpdateBookRequest, Book> {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute(request: UpdateBookRequest): Promise<Book> {
    const book = await this.bookRepository.findById(request.id);
    if (!book) {
      throw new Error(`Book with id ${request.id} not found`);
    }

    book.title = request.title ?? book.title;
    book.author = request.author ?? book.author;
    book.publishedYear = request.publishedYear ?? book.publishedYear;

    await this.bookRepository.update(request.id, book);
    return book;
  }
}
