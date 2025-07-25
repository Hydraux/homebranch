import { Injectable } from '@nestjs/common';
import { IBookRepository } from 'src/application/interfaces/book-repository';
import { Repository } from 'typeorm';
import { BookEntity } from '../database/book.entity';
import { BookMapper } from '../mappers/book.mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/domain/entities/book.entity';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { BookNotFoundError } from 'src/domain/exceptions/book.exceptions';

@Injectable()
export class TypeOrmBookRepository implements IBookRepository {
  constructor(
    @InjectRepository(BookEntity) private repository: Repository<BookEntity>,
  ) {}

  async create(entity: Book): Promise<Book> {
    const bookEntity = BookMapper.toPersistence(entity);
    const savedEntity = await this.repository.save(bookEntity);
    return BookMapper.toDomain(savedEntity);
  }

  async findAll(): Promise<Book[]> {
    const bookEntities = await this.repository.find();
    return BookMapper.toDomainList(bookEntities);
  }

  async findById(id: string): Promise<Book | null> {
    const bookEntity =
      (await this.repository.findOne({ where: { id } })) || null;
    return bookEntity ? BookMapper.toDomain(bookEntity) : null;
  }

  async save(book: Book): Promise<void> {
    const bookEntity = BookMapper.toPersistence(book);
    await this.repository.save(bookEntity);
  }

  async update(id: string, book: Book): Promise<void> {
    const bookEntity = BookMapper.toPersistence(book);
    await this.repository.save(bookEntity);
    return;
  }

  async delete(id: string): Promise<void> {
    const book = await this.findById(id);
    if (!book) {
      throw new BookNotFoundError();
    }
    if (
      existsSync(
        `${process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads')}/books/${book.fileName}`,
      )
    ) {
      unlinkSync(
        `${process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads')}/books/${book.fileName}`,
      );
    }
    if (
      existsSync(
        `${process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads')}/cover-images/${book.coverImageFileName}`,
      )
    ) {
      unlinkSync(
        `${process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads')}/cover-images/${book.coverImageFileName}`,
      );
    }
    await this.repository.delete(id);
    return;
  }

  async findByAuthor(author: string): Promise<Book[]> {
    const bookEntities = await this.repository.find({ where: { author } });
    return BookMapper.toDomainList(bookEntities);
  }

  async findFavorited(): Promise<Book[]> {
    const bookEntities = await this.repository.find({
      where: { isFavorited: true },
    });
    return BookMapper.toDomainList(bookEntities);
  }

  async findByTitle(title: string): Promise<Book | null> {
    const bookEntity =
      (await this.repository.findOne({ where: { title } })) || null;
    return bookEntity ? BookMapper.toDomain(bookEntity) : null;
  }
}
