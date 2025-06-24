import { Inject, Injectable } from '@nestjs/common';
import { CreateBookRequest } from '../contracts/create-book-request';
import { IBookRepository } from '../interfaces/book-repository';
import { UseCase } from '../interfaces/usecase';
import { BookFactory } from 'src/domain/entities/book.factory';
import { Book } from 'src/domain/entities/book.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class CreateBookUseCase implements UseCase<CreateBookRequest, Book> {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute(dto: CreateBookRequest): Promise<Book> {
    const id = randomUUID();
    const book = BookFactory.create(
      id,
      dto.title,
      dto.author,
      dto.fileName,
      dto.isFavorited ?? false,
      dto.publishedYear,
      dto.coverImageFileName,
    );
    await this.bookRepository.save(book);
    return book;
  }
}
