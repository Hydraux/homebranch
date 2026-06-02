import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthorService } from 'src/modules/author/author.service';
import { PaginationResult } from 'src/common/core/pagination_result';
import { BookEntity } from 'src/modules/book/book.entity';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { mockBookEntity } from 'test/mocks/bookMocks';

describe('AuthorService.getBooksByAuthor', () => {
  let service: AuthorService;
  let bookRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    bookRepository = { createQueryBuilder: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorService,
        {
          provide: getRepositoryToken(AuthorEntity),
          useValue: {},
        },
        { provide: getRepositoryToken(BookEntity), useValue: bookRepository },
        { provide: OpenLibraryGateway, useValue: { enrichAuthor: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthorService>(AuthorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Returns books by author when no query is provided', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValueOnce([[mockBookEntity], 1]),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(queryBuilder);

    const paginationResult: PaginationResult<BookEntity[]> = {
      data: [mockBookEntity],
      limit: 10,
      offset: 0,
      total: 1,
      nextCursor: null,
    };

    const result = await service.getBooksByAuthor('Test Author', undefined, 10, 0);

    expect(queryBuilder.where).toHaveBeenCalledWith('book.author = :author', { author: 'Test Author' });
    expect(result).toEqual(paginationResult);
  });

  test('Searches books by author and title when query is provided', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValueOnce([[], 0]),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(queryBuilder);

    await service.getBooksByAuthor('Test Author', 'Test', 10, 0);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('LOWER(book.title) LIKE LOWER(:title)', { title: '%Test%' });
  });

  test('Returns empty list when author has no books', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValueOnce([[], 0]),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(queryBuilder);

    const paginationResult: PaginationResult<BookEntity[]> = {
      data: [],
      limit: 10,
      offset: 0,
      total: 0,
      nextCursor: null,
    };

    const result = await service.getBooksByAuthor('Unknown Author', undefined, 10, 0);

    expect(result).toEqual(paginationResult);
  });
});
