import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PaginationResult } from 'src/common/core/pagination_result';
import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { BookEntity } from 'src/modules/book/book.entity';

@Injectable()
export class BookShelfService {
  constructor(
    @InjectRepository(BookShelfEntity)
    private readonly bookShelfRepository: Repository<BookShelfEntity>,
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,
  ) {}

  async getBookShelves(limit?: number, offset?: number, userId?: string): Promise<PaginationResult<BookShelfEntity[]>> {
    const [bookShelves, total] = await this.bookShelfRepository.findAndCount({
      where: userId ? { createdByUserId: userId } : undefined,
      relations: ['books'],
      take: limit,
      skip: offset,
    });

    return {
      data: bookShelves,
      limit,
      offset,
      total,
      nextCursor: limit && total > (offset ?? 0) + limit ? (offset ?? 0) + limit : null,
    };
  }

  async getBookShelfById(id: string): Promise<BookShelfEntity> {
    const shelf = await this.bookShelfRepository.findOne({
      where: { id },
      relations: ['books'],
    });

    if (!shelf) {
      throw new NotFoundException('Bookshelf not found');
    }

    return shelf;
  }

  async getBookShelfBooks(id: string): Promise<PaginationResult<BookEntity[]>> {
    await this.ensureBookShelfExists(id);

    const [books, total] = await this.bookRepository
      .createQueryBuilder('book')
      .innerJoin('book.bookShelves', 'shelf', 'shelf.id = :shelfId', {
        shelfId: id,
      })
      .where('book.deletedAt IS NULL')
      .orderBy('book.author', 'ASC')
      .addOrderBy('book.title', 'ASC')
      .getManyAndCount();

    return {
      data: books,
      total,
      nextCursor: null,
    };
  }

  async getBookShelvesByBook(bookId: string): Promise<BookShelfEntity[]> {
    return this.bookShelfRepository
      .createQueryBuilder('shelf')
      .innerJoin('shelf.books', 'book', 'book.id = :bookId', { bookId })
      .getMany();
  }

  async createBookShelf(title: string, userId?: string): Promise<BookShelfEntity> {
    const shelf = this.bookShelfRepository.create({
      id: randomUUID(),
      title,
      books: [],
      createdByUserId: userId,
    });

    return this.bookShelfRepository.save(shelf);
  }

  async deleteBookShelf(id: string): Promise<BookShelfEntity> {
    const shelf = await this.getBookShelfById(id);
    await this.bookShelfRepository.delete(id);
    return shelf;
  }

  async updateBookShelf(id: string, title?: string): Promise<BookShelfEntity> {
    const shelf = await this.getBookShelfById(id);
    shelf.title = title ?? shelf.title;
    await this.bookShelfRepository.save(shelf);
    return this.getBookShelfById(id);
  }

  async addBookToBookShelf(bookShelfId: string, bookId: string): Promise<BookShelfEntity> {
    const shelf = await this.getBookShelfById(bookShelfId);

    if (shelf.books.find((book) => book.id === bookId)) {
      return shelf;
    }

    const book = await this.bookRepository.findOne({
      where: { id: bookId, deletedAt: IsNull() },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.bookShelfRepository.createQueryBuilder().relation(BookShelfEntity, 'books').of(bookShelfId).add(bookId);
    return this.getBookShelfById(bookShelfId);
  }

  async removeBookFromBookShelf(bookShelfId: string, bookId: string): Promise<BookShelfEntity> {
    const shelf = await this.getBookShelfById(bookShelfId);

    if (!shelf.books.find((book) => book.id === bookId)) {
      return shelf;
    }

    await this.bookShelfRepository
      .createQueryBuilder()
      .relation(BookShelfEntity, 'books')
      .of(bookShelfId)
      .remove(bookId);
    return this.getBookShelfById(bookShelfId);
  }

  private async ensureBookShelfExists(id: string): Promise<void> {
    const exists = await this.bookShelfRepository.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Bookshelf not found');
    }
  }
}
