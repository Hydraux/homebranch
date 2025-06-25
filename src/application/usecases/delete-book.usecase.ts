import { Inject, Injectable } from '@nestjs/common';
import { IBookRepository } from '../interfaces/book-repository';
import { UseCase } from '../interfaces/usecase';
import { DeleteBookRequest } from '../contracts/delete-book-request';

@Injectable()
export class DeleteBookUseCase implements UseCase<DeleteBookRequest, void> {
  constructor(
    @Inject('BookRepository') private bookRepository: IBookRepository,
  ) {}

  async execute({ id }: DeleteBookRequest): Promise<void> {
    try {
      await this.bookRepository.delete(id);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error('Error deleting book: ' + error.message);
    }
  }
}
