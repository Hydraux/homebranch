import { ConflictException, Injectable } from '@nestjs/common';
import { PaginationResult } from 'src/common/core/pagination_result';
import { DuplicateScanQueueService } from 'src/modules/book/deduplication/duplicate-scan-queue.service';
import {
  BookDuplicateWithBooks,
  BookDuplicatePersistenceService,
} from 'src/modules/book/deduplication/book-duplicate.persistence';
import { DuplicateResolution } from 'src/modules/book/deduplication/book-duplicate.entity';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

@Injectable()
export class BookDuplicateService {
  constructor(
    private readonly duplicatePersistenceService: BookDuplicatePersistenceService,
    private readonly bookPersistenceService: BookPersistenceService,
    private readonly duplicateScanQueue: DuplicateScanQueueService,
  ) {}

  async listDuplicates(limit?: number, offset?: number): Promise<PaginationResult<BookDuplicateWithBooks[]>> {
    return this.duplicatePersistenceService.listUnresolvedBookDuplicates(limit, offset);
  }

  async triggerScan(): Promise<{ message: string }> {
    await this.duplicateScanQueue.enqueueScan();
    return { message: 'Duplicate scan job enqueued' };
  }

  async resolveDuplicate(id: string, action: DuplicateResolution, resolvedByUserId: string) {
    const duplicate = await this.duplicatePersistenceService.findBookDuplicateById(id);

    if (duplicate.resolvedAt) {
      throw new ConflictException('This duplicate has already been resolved');
    }

    if (action === 'merge') {
      await this.bookPersistenceService.permanentDeleteBook(duplicate.suspectBookId);
    } else if (action === 'replace') {
      await this.bookPersistenceService.permanentDeleteBook(duplicate.originalBookId);
    }

    const resolved = await this.duplicatePersistenceService.resolveBookDuplicate(id, action, resolvedByUserId);
    if (!resolved) {
      return duplicate;
    }

    return resolved;
  }
}
