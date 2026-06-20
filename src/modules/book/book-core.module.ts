import { Module } from '@nestjs/common';
import { BookService } from 'src/modules/book/catalog/book.service';
import { BookMutationService } from 'src/modules/book/catalog/book-mutation.service';
import { QueueModule } from 'src/modules/queue/queue.module';
import { BookMetadataModule } from 'src/modules/book/metadata/book-metadata.module';
import { BookFormatModule } from 'src/modules/book/format/book-format.module';
import { BookPersistenceModule } from 'src/modules/book/persistence/book-persistence.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [BookPersistenceModule, BookMetadataModule, BookFormatModule, QueueModule, StorageModule],
  providers: [BookService, BookMutationService],
  exports: [BookPersistenceModule, BookService, BookMutationService, BookMetadataModule, BookFormatModule],
})
export class BookCoreModule {}
