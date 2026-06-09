import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { PaginationResult } from 'src/common/core/pagination_result';
import { Book } from 'src/modules/book/book.model';
import { FileProcessingQueueService } from 'src/modules/queue/file-processing-queue.service';
import { LibraryScanQueueService } from 'src/modules/queue/library-scan-queue.service';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

@Injectable()
export class LibrarySyncService {
  constructor(
    private readonly libraryScanQueue: LibraryScanQueueService,
    private readonly fileProcessingQueue: FileProcessingQueueService,
    private readonly bookPersistenceService: BookPersistenceService,
  ) {}

  async triggerScan(): Promise<{ jobId: string | undefined }> {
    const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';
    return this.libraryScanQueue.enqueueScan(join(uploadsDirectory, 'books'));
  }

  async triggerBookMetadataSync(bookId: string): Promise<{ jobId: string | undefined }> {
    const book = await this.bookPersistenceService.findBookById(bookId);
    const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';

    return this.fileProcessingQueue.enqueueMetadataSync(
      bookId,
      book.fileName,
      join(uploadsDirectory, 'books', book.fileName),
      {
        jobId: `sync-${bookId}-manual`,
      },
    );
  }

  async getUnownedBooks(limit = 20, offset = 0): Promise<PaginationResult<Book[]>> {
    return this.bookPersistenceService.findUnownedBooks(limit, offset);
  }

  async getOrphanedBooks(knownUserIds: string[] = [], limit = 20, offset = 0): Promise<PaginationResult<Book[]>> {
    return this.bookPersistenceService.findOrphanedBooks(knownUserIds, limit, offset);
  }
}
