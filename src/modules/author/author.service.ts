import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { PaginationResult } from 'src/common/core/pagination_result';

@Injectable()
export class AuthorService {
  constructor(
    @InjectRepository(AuthorEntity)
    private readonly authorRepository: Repository<AuthorEntity>,
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,
    private readonly openLibraryGateway: OpenLibraryGateway,
  ) {}

  async getAuthors(
    query?: string,
    limit?: number,
    offset?: number,
    userId?: string,
  ): Promise<PaginationResult<AuthorEntity[]>> {
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .select('book.author', 'name')
      .addSelect('COUNT(book.id)', 'bookCount')
      .addSelect('author.id', 'id')
      .addSelect('author.biography', 'biography')
      .addSelect('author.profile_picture_url', 'profilePictureUrl')
      .leftJoin(AuthorEntity, 'author', 'LOWER(author.name) = LOWER(book.author)')
      .where('book.deletedAt IS NULL')
      .groupBy('book.author')
      .addGroupBy('author.id')
      .addGroupBy('author.biography')
      .addGroupBy('author.profile_picture_url')
      .orderBy('book.author', 'ASC');

    if (userId) {
      queryBuilder.where('book.uploadedByUserId = :userId', { userId });
    }

    if (query) {
      queryBuilder.andWhere('LOWER(book.author) LIKE LOWER(:query)', {
        query: `%${query}%`,
      });
    }

    const countQueryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .select('COUNT(DISTINCT book.author)', 'count');

    if (userId) {
      countQueryBuilder.where('book.uploadedByUserId = :userId', { userId });
    }

    if (query) {
      countQueryBuilder.andWhere('LOWER(book.author) LIKE LOWER(:query)', {
        query: `%${query}%`,
      });
    }

    const countResult = (await countQueryBuilder.getRawOne()) as { count: string } | null;
    const total = parseInt(countResult?.count ?? '0', 10);

    if (limit !== undefined) {
      queryBuilder.limit(limit);
    }
    if (offset !== undefined) {
      queryBuilder.offset(offset);
    }

    const rows = await queryBuilder.getRawMany<{
      id: string | null;
      name: string;
      biography: string | null;
      profilePictureUrl: string | null;
      bookCount: string;
    }>();

    const authors = rows.map((row) =>
      Object.assign(new AuthorEntity(), {
        id: row.id ?? null,
        name: row.name,
        biography: row.biography ?? null,
        profilePictureUrl: row.profilePictureUrl ?? null,
        bookCount: parseInt(row.bookCount, 10),
      }),
    );

    return {
      data: authors,
      limit,
      offset,
      total,
      nextCursor: limit && total > (offset ?? 0) + limit ? (offset ?? 0) + limit : null,
    };
  }

  async getAuthor(name: string): Promise<AuthorEntity> {
    const existing = await this.findAuthorByName(name);
    if (existing) {
      if (existing.biography !== null || existing.profilePictureUrl !== null) {
        return existing;
      }

      const enrichedAuthor = await this.openLibraryGateway.enrichAuthor(existing);
      return this.authorRepository.save(enrichedAuthor);
    }

    const author = Object.assign(new AuthorEntity(), {
      id: randomUUID(),
      name,
      biography: null,
      profilePictureUrl: null,
    });

    const enrichedAuthor = await this.openLibraryGateway.enrichAuthor(author);
    return this.authorRepository.save(enrichedAuthor);
  }

  async getBooksByAuthor(
    name: string,
    query?: string,
    limit?: number,
    offset?: number,
    userId?: string,
  ): Promise<PaginationResult<BookEntity[]>> {
    const qb = this.bookRepository
      .createQueryBuilder('book')
      .where('book.author = :author', { author: name })
      .andWhere('book.deletedAt IS NULL');

    if (query) {
      qb.andWhere('LOWER(book.title) LIKE LOWER(:title)', { title: `%${query}%` });
    }

    if (userId) {
      qb.andWhere('book.uploadedByUserId = :userId', { userId });
    }

    const [books, total] = await qb.orderBy('book.title', 'ASC').limit(limit).skip(offset).getManyAndCount();

    return {
      data: books,
      limit,
      offset,
      total,
      nextCursor: limit && total > (offset ?? 0) + limit ? (offset ?? 0) + limit : null,
    };
  }

  async updateAuthor(name: string, biography?: string): Promise<AuthorEntity> {
    const author = await this.requireAuthor(name);
    author.biography = biography !== undefined ? biography : author.biography;
    return this.authorRepository.save(author);
  }

  async uploadProfilePicture(name: string, profilePictureUrl: string): Promise<AuthorEntity> {
    const author = await this.requireAuthor(name);
    author.profilePictureUrl = profilePictureUrl;
    return this.authorRepository.save(author);
  }

  private async requireAuthor(name: string): Promise<AuthorEntity> {
    const author = await this.findAuthorByName(name);
    if (!author) {
      throw new NotFoundException('Author not found');
    }
    return author;
  }

  private findAuthorByName(name: string): Promise<AuthorEntity | null> {
    return this.authorRepository
      .createQueryBuilder('author')
      .where('LOWER(author.name) = LOWER(:name)', { name })
      .getOne();
  }
}
