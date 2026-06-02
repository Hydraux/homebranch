import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BookDuplicatePersistenceService } from 'src/modules/book/deduplication/book-duplicate.persistence';

@Injectable()
export class BookDuplicateRegistrationService {
  private readonly logger = new Logger(BookDuplicateRegistrationService.name);

  constructor(private readonly duplicatePersistenceService: BookDuplicatePersistenceService) {}

  async flagPotentialDuplicate(suspectBookId: string, originalBookId: string): Promise<void> {
    await this.duplicatePersistenceService.createBookDuplicate({
      id: randomUUID(),
      suspectBookId,
      originalBookId,
      detectedAt: new Date(),
    });
    this.logger.log(`Potential duplicate flagged: suspect ${suspectBookId} vs original ${originalBookId}`);
  }
}
