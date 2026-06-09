import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { Book } from 'src/modules/book/book.model';
import { BookDuplicatePersistenceService } from 'src/modules/book/deduplication/book-duplicate.persistence';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

@Processor('duplicate-scan')
export class DuplicateScanProcessor extends WorkerHost {
  private readonly logger = new Logger(DuplicateScanProcessor.name);

  constructor(
    private readonly bookPersistenceService: BookPersistenceService,
    private readonly duplicatePersistenceService: BookDuplicatePersistenceService,
    private readonly contentHashService: ContentHashService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'scan-duplicates') {
      await this.scanForDuplicates(job);
    } else {
      this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async scanForDuplicates(job: Job): Promise<void> {
    this.logger.log('Starting library duplicate scan');
    await job.updateProgress(0);

    let allBooks: Book[];
    try {
      allBooks = await this.bookPersistenceService.findAllActiveBooks();
    } catch {
      this.logger.warn('Failed to fetch active books for duplicate scan');
      return;
    }
    const uploadsDir = process.env.UPLOADS_DIRECTORY || './uploads';
    const booksDir = join(uploadsDir, 'books');

    // Recompute content hashes (spine-only) for all books, updating stale stored values.
    // This ensures books uploaded before the content-hash algorithm change are rehashed.
    await job.updateProgress(5);
    for (const book of allBooks) {
      const filePath = join(booksDir, book.fileName);
      try {
        const freshHash = await this.contentHashService.computeHash(filePath);
        if (freshHash !== book.fileContentHash) {
          await this.bookPersistenceService.updateStoredBookContentHash(book.id, freshHash);
          book.fileContentHash = freshHash;
        }
      } catch {
        // File may not be accessible; skip rehash for this book
      }
    }

    await job.updateProgress(10);

    // Group books by content hash — any group with 2+ books contains duplicates
    const byHash = new Map<string, Book[]>();
    for (const book of allBooks.filter((b) => b.fileContentHash)) {
      const hash = book.fileContentHash!;
      const group = byHash.get(hash) ?? [];
      group.push(book);
      byHash.set(hash, group);
    }

    const groups = [...byHash.values()].filter((g) => g.length >= 2);
    const totalGroups = groups.length;
    let flagged = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          // Check if already flagged (either direction)
          const existing = await this.duplicatePersistenceService.findBookDuplicateByBookIds(a.id, b.id);
          if (existing) continue;

          const reverseExisting = await this.duplicatePersistenceService.findBookDuplicateByBookIds(b.id, a.id);
          if (reverseExisting) continue;

          // Newer book is the suspect
          const [suspect, original] = a.createdAt > b.createdAt ? [a, b] : [b, a];
          await this.duplicatePersistenceService.createBookDuplicate({
            id: randomUUID(),
            suspectBookId: suspect.id,
            originalBookId: original.id,
            detectedAt: new Date(),
          });
          flagged++;
          this.logger.log(
            `Potential duplicate flagged: "${suspect.title}" (${suspect.id}) vs "${original.title}" (${original.id})`,
          );
        }
      }

      const progress = totalGroups > 0 ? Math.round(10 + ((gi + 1) / totalGroups) * 90) : 100;
      await job.updateProgress(progress);
    }

    if (totalGroups === 0) {
      await job.updateProgress(100);
    }

    this.logger.log(`Duplicate scan complete. Flagged ${flagged} new potential duplicate(s).`);
  }
}
