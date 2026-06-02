import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { BookShelfController } from 'src/modules/book-shelf/book-shelf.controller';
import { BookShelfService } from 'src/modules/book-shelf/book-shelf.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookShelfEntity, BookEntity]), AuthModule],
  providers: [BookShelfService],
  controllers: [BookShelfController],
  exports: [BookShelfService],
})
export class BookShelvesModule {}
