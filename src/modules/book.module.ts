import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateBookUseCase } from 'src/application/usecases/create-book.usecase';
import { DeleteBookUseCase } from 'src/application/usecases/delete-book.usecase';
import { GetBookByIdUseCase } from 'src/application/usecases/get-book-by-id.usecase';
import { GetBooksUseCase } from 'src/application/usecases/get-books.usecase';
import { GetFavoritedBooksUseCase } from 'src/application/usecases/get-favorited-books.usecase';
import { UpdateBookUseCase } from 'src/application/usecases/update-book.usecase';
import { BookEntity } from 'src/infrastructure/database/book.entity';
import { BookMapper } from 'src/infrastructure/mappers/book.mapper';
import { TypeOrmBookRepository } from 'src/infrastructure/repositories/book.repository';
import { BookController } from 'src/presentation/controllers/book.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BookEntity])],
  providers: [
    // Repository
    {
      provide: 'BookRepository',
      useClass: TypeOrmBookRepository,
    },

    // Use Cases (add all that your controller uses)
    CreateBookUseCase,
    DeleteBookUseCase,
    GetBooksUseCase,
    GetFavoritedBooksUseCase,
    GetBookByIdUseCase,
    UpdateBookUseCase,
    // ... other use cases

    // Mappers
    BookMapper,
  ],
  controllers: [BookController],
  exports: [],
})
export class BooksModule {}
