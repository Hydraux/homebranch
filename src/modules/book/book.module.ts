import { Module } from '@nestjs/common';
import { BookCreationService } from 'src/modules/book/catalog/book-creation.service';
import { BookController } from 'src/modules/book/catalog/book.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { BookPublicationModule } from 'src/modules/book/publication/book-publication.module';
import { StorageModule } from '../storage/storage.module';
import { BookDuplicateController } from './deduplication/book-duplicate.controller';
import { BookDuplicateService } from './deduplication/book-duplicate.service';
import { BookDuplicatePersistenceService } from './deduplication/book-duplicate.persistence';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookDuplicateEntity } from './deduplication/book-duplicate.entity';
import { BookDuplicateRegistrationService } from './deduplication/book-duplicate-registration.service';
import { DuplicateScanQueueService } from './deduplication/duplicate-scan-queue.service';
import { DuplicateScanSchedulerService } from './deduplication/duplicate-scan-scheduler.service';
import { DuplicateScanProcessor } from './deduplication/duplicate-scan.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookDuplicateEntity]),
    AuthModule,
    BookCoreModule,
    BookPublicationModule,
    StorageModule,
    BullModule.registerQueue({ name: 'duplicate-scan' }),
  ],
  providers: [
    BookDuplicatePersistenceService,
    BookDuplicateRegistrationService,
    BookDuplicateService,
    DuplicateScanQueueService,
    DuplicateScanSchedulerService,
    DuplicateScanProcessor,
    BookCreationService,
  ],
  controllers: [BookDuplicateController, BookController],
})
export class BooksModule {}
