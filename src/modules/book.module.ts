import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetBooksUseCase } from 'src/application/usecases/get-books.usecase';
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
    GetBooksUseCase,
    // ... other use cases
    
    // Mappers
    BookMapper,
  ],
  controllers: [BookController],
  exports: [],
})
export class BooksModule {}