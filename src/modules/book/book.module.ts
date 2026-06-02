import { Module } from '@nestjs/common';
import { BookCreationService } from 'src/modules/book/catalog/book-creation.service';
import { BookController } from 'src/modules/book/catalog/book.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { BookDeduplicationModule } from 'src/modules/book/deduplication/book-deduplication.module';
import { BookPublicationModule } from 'src/modules/book/publication/book-publication.module';

@Module({
  imports: [AuthModule, BookCoreModule, BookDeduplicationModule, BookPublicationModule],
  providers: [BookCreationService],
  controllers: [BookController],
})
export class BooksModule {}
