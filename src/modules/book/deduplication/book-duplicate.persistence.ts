import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaginationResult } from 'src/common/core/pagination_result';
import { BookDuplicateEntity, DuplicateResolution } from 'src/modules/book/deduplication/book-duplicate.entity';
import { Book } from 'src/modules/book/book.model';
import { normalizeBookEntity } from 'src/modules/book/persistence/book.persistence';

export interface BookDuplicateWithBooks {
  duplicate: BookDuplicateEntity;
  suspectBook: Book;
  originalBook: Book;
}

@Injectable()
export class BookDuplicatePersistenceService {
  constructor(
    @InjectRepository(BookDuplicateEntity)
    private readonly duplicateRepository: Repository<BookDuplicateEntity>,
  ) {}

  createBookDuplicate(duplicate: Partial<BookDuplicateEntity>): Promise<BookDuplicateEntity> {
    return createBookDuplicate(this.duplicateRepository, duplicate);
  }

  findBookDuplicateById(id: string): Promise<BookDuplicateEntity> {
    return findBookDuplicateById(this.duplicateRepository, id);
  }

  findBookDuplicateByBookIds(suspectBookId: string, originalBookId: string): Promise<BookDuplicateEntity | null> {
    return findBookDuplicateByBookIds(this.duplicateRepository, suspectBookId, originalBookId);
  }

  listUnresolvedBookDuplicates(limit?: number, offset?: number): Promise<PaginationResult<BookDuplicateWithBooks[]>> {
    return listUnresolvedBookDuplicates(this.duplicateRepository, limit, offset);
  }

  resolveBookDuplicate(
    id: string,
    resolution: DuplicateResolution,
    resolvedByUserId: string,
  ): Promise<BookDuplicateEntity | null> {
    return resolveBookDuplicate(this.duplicateRepository, id, resolution, resolvedByUserId);
  }
}

export async function createBookDuplicate(
  repository: Repository<BookDuplicateEntity>,
  duplicate: Partial<BookDuplicateEntity>,
): Promise<BookDuplicateEntity> {
  const entity = repository.create(duplicate);
  return repository.save(entity);
}

export async function findBookDuplicateById(
  repository: Repository<BookDuplicateEntity>,
  id: string,
): Promise<BookDuplicateEntity> {
  const entity = await repository.findOne({ where: { id } });
  if (!entity) {
    throw new NotFoundException('Book duplicate not found');
  }
  return entity;
}

export async function findBookDuplicateByBookIds(
  repository: Repository<BookDuplicateEntity>,
  suspectBookId: string,
  originalBookId: string,
): Promise<BookDuplicateEntity | null> {
  return (
    (await repository.findOne({
      where: { suspectBookId, originalBookId, resolvedAt: IsNull() },
    })) ?? null
  );
}

export async function listUnresolvedBookDuplicates(
  repository: Repository<BookDuplicateEntity>,
  limit?: number,
  offset?: number,
): Promise<PaginationResult<BookDuplicateWithBooks[]>> {
  const [entities, total] = await repository.findAndCount({
    where: { resolvedAt: IsNull() },
    relations: { suspectBook: true, originalBook: true },
    order: { detectedAt: 'DESC' },
    take: limit,
    skip: offset,
  });

  return {
    data: entities.map((entity) => ({
      duplicate: entity,
      suspectBook: normalizeBookEntity(entity.suspectBook),
      originalBook: normalizeBookEntity(entity.originalBook),
    })),
    limit,
    offset,
    total,
    nextCursor: offset != null && limit != null && total > offset + limit ? offset + limit : null,
  };
}

export async function resolveBookDuplicate(
  repository: Repository<BookDuplicateEntity>,
  id: string,
  resolution: DuplicateResolution,
  resolvedByUserId: string,
): Promise<BookDuplicateEntity | null> {
  const entity = await repository.findOne({ where: { id } });
  if (!entity) {
    return null;
  }

  entity.resolution = resolution;
  entity.resolvedAt = new Date();
  entity.resolvedByUserId = resolvedByUserId;

  return repository.save(entity);
}
