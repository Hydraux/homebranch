import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from 'src/modules/book/book.entity';
import { UserBookFavoriteEntity } from 'src/modules/book/user-book-favorite.entity';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatModule } from 'src/modules/book/format/book-format.module';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

@Module({
  imports: [TypeOrmModule.forFeature([BookEntity, BookFormatEntity, UserBookFavoriteEntity]), BookFormatModule],
  providers: [BookPersistenceService],
  exports: [BookPersistenceService, TypeOrmModule],
})
export class BookPersistenceModule {}
