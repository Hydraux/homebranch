import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Book } from 'src/modules/book/book.model';
import { CompositeMetadataGateway } from 'src/modules/book/metadata/gateways/composite-metadata.gateway';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

const BATCH_SIZE = 20;
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_DELAY_MS = 400;

@Injectable()
export class MetadataSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MetadataSchedulerService.name);

  constructor(
    private readonly bookPersistenceService: BookPersistenceService,
    private readonly metadataGateway: CompositeMetadataGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('MetadataSchedulerService initialized');
    await this.enrichBooksWithMissingMetadata();
  }

  @Interval(INTERVAL_MS)
  async enrichBooksWithMissingMetadata(): Promise<void> {
    let books: Book[];
    try {
      books = await this.bookPersistenceService.findBooksWithoutMetadata(BATCH_SIZE);
    } catch {
      this.logger.warn('Failed to fetch books without metadata');
      return;
    }
    if (books.length === 0) {
      return;
    }

    this.logger.log(`Enriching metadata for ${books.length} book(s)`);

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      try {
        const enriched = await this.metadataGateway.enrichBook(book);
        await this.bookPersistenceService.updateBookRecord(enriched.id, enriched);
      } catch (error) {
        this.logger.warn(`Metadata enrichment failed for book "${book.title}": ${String(error)}`);
      }

      if (i < books.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    this.logger.log(`Metadata enrichment complete for ${books.length} book(s)`);
  }
}
