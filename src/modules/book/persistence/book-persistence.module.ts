import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from 'src/modules/book/book.entity';
import { UserBookFavoriteEntity } from 'src/modules/book/user-book-favorite.entity';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatModule } from 'src/modules/book/format/book-format.module';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookEntity, BookFormatEntity, UserBookFavoriteEntity]),
    BookFormatModule,
    StorageModule,
  ],
  providers: [BookPersistenceService],
  exports: [BookPersistenceService, TypeOrmModule],
})
export class BookPersistenceModule {}
