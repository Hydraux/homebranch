import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { BookDuplicateEntity } from 'src/modules/book/deduplication/book-duplicate.entity';
import { BookDuplicateRegistrationService } from 'src/modules/book/deduplication/book-duplicate-registration.service';
import { BookDuplicateService } from 'src/modules/book/deduplication/book-duplicate.service';
import { DuplicateScanQueueService } from 'src/modules/book/deduplication/duplicate-scan-queue.service';
import { DuplicateScanSchedulerService } from 'src/modules/book/deduplication/duplicate-scan-scheduler.service';
import { DuplicateScanProcessor } from 'src/modules/book/deduplication/duplicate-scan.processor';
import { BookDuplicateController } from 'src/modules/book/deduplication/book-duplicate.controller';
import { BookDuplicatePersistenceService } from 'src/modules/book/deduplication/book-duplicate.persistence';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookDuplicateEntity]),
    BullModule.registerQueue({ name: 'duplicate-scan' }),
    AuthModule,
    BookCoreModule,
  ],
  providers: [
    BookDuplicatePersistenceService,
    BookDuplicateRegistrationService,
    BookDuplicateService,
    DuplicateScanQueueService,
    DuplicateScanSchedulerService,
    DuplicateScanProcessor,
  ],
  controllers: [BookDuplicateController],
  exports: [BookDuplicateRegistrationService],
})
export class BookDeduplicationModule {}
