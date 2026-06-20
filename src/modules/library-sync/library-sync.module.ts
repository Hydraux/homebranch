import { Module } from '@nestjs/common';
import { FileWatcherService } from 'src/modules/library-sync/file-watcher.service';
import { LibraryScanProcessor } from 'src/modules/library-sync/library-scan.processor';
import { FileProcessingProcessor } from 'src/modules/library-sync/file-processing.processor';
import { LegacyRenameService } from 'src/modules/library-sync/legacy-rename.service';
import { LibrarySyncController } from 'src/modules/library-sync/library-sync.controller';
import { LibraryEventsService } from 'src/modules/library-sync/library-events.service';
import { LibrarySyncService } from 'src/modules/library-sync/library-sync.service';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { QueueModule } from 'src/modules/queue/queue.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [BookCoreModule, AuthModule, SettingsModule, QueueModule, StorageModule],
  providers: [
    LibraryEventsService,
    LibrarySyncService,
    FileWatcherService,
    LibraryScanProcessor,
    FileProcessingProcessor,
    LegacyRenameService,
  ],
  exports: [LibraryEventsService],
  controllers: [LibrarySyncController],
})
export class LibrarySyncModule {}
