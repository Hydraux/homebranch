import { Inject, Injectable } from '@nestjs/common';
import { IBookRepository } from '../interfaces/book-repository';

@Injectable()
export class GetFavoritedBooksUseCase {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute(): Promise<any[]> {
    try {
      const books = await this.bookRepository.findFavorited();
      return books;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error('Error fetching books: ' + error.message);
    }
  }
}
