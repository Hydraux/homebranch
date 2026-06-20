import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { AuthorController } from 'src/modules/author/author.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthorService } from 'src/modules/author/author.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorEntity, BookEntity]), AuthModule, StorageModule],
  providers: [OpenLibraryGateway, AuthorService],
  controllers: [AuthorController],
  exports: [AuthorService],
})
export class AuthorsModule {}
