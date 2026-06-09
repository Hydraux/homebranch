import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileNameGenerator } from 'src/common/utils/filename-generator';
import { Book } from 'src/modules/book/book.model';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

@Injectable()
export class LegacyRenameService implements OnModuleInit {
  private readonly logger = new Logger(LegacyRenameService.name);

  constructor(
    private readonly bookPersistenceService: BookPersistenceService,
    @InjectQueue('file-processing') private readonly fileProcessingQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.enqueueLegacyRenames();
  }

  private async enqueueLegacyRenames() {
    let books: Book[];
    try {
      books = await this.bookPersistenceService.findAllActiveBooks();
    } catch {
      this.logger.warn('Failed to fetch books for legacy rename check');
      return;
    }
    const existingNames = new Set(books.map((b) => b.fileName));
    let enqueued = 0;

    for (const book of books) {
      if (!FileNameGenerator.isLegacyUuidFileName(book.fileName)) continue;

      const baseName = FileNameGenerator.generate(book.author, book.title);
      const newFileName = FileNameGenerator.disambiguate(baseName, existingNames);
      existingNames.add(newFileName);

      await this.fileProcessingQueue.add(
        'rename-legacy-file',
        {
          bookId: book.id,
          currentFileName: book.fileName,
          newFileName,
        },
        {
          jobId: `rename-${book.id}`,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );
      enqueued++;
    }

    if (enqueued > 0) {
      this.logger.log(`Enqueued ${enqueued} legacy file renames`);
    }
  }
}
