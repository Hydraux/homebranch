import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthorService } from 'src/modules/author/author.service';
import { PaginationResult } from 'src/common/core/pagination_result';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { mockAuthorEntity } from 'test/mocks/authorMocks';

describe('AuthorService.getAuthors', () => {
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

  test('Successfully retrieves paginated authors', async () => {
    const dataQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([
        {
          id: mockAuthorEntity.id,
          name: mockAuthorEntity.name,
          biography: mockAuthorEntity.biography,
          profilePictureUrl: mockAuthorEntity.profilePictureUrl,
          bookCount: '1',
        },
      ]),
    };
    const countQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValueOnce({ count: '1' }),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(dataQuery).mockReturnValueOnce(countQuery);

    const paginationResult: PaginationResult<AuthorEntity[]> = {
      data: [{ ...mockAuthorEntity, bookCount: 1 }],
      limit: 10,
      offset: 0,
      total: 1,
      nextCursor: null,
    };

    const result = await service.getAuthors(undefined, 10, 0);

    expect(result).toEqual(paginationResult);
  });

  test('Passes search query to repository', async () => {
    const dataQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([]),
    };
    const countQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValueOnce({ count: '0' }),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(dataQuery).mockReturnValueOnce(countQuery);

    await service.getAuthors('jane', 10, 0, 'user-123');

    expect(dataQuery.where).toHaveBeenCalledWith('book.uploadedByUserId = :userId', { userId: 'user-123' });
    expect(dataQuery.andWhere).toHaveBeenCalledWith('LOWER(book.author) LIKE LOWER(:query)', { query: '%jane%' });
    expect(countQuery.where).toHaveBeenCalledWith('book.uploadedByUserId = :userId', { userId: 'user-123' });
    expect(countQuery.andWhere).toHaveBeenCalledWith('LOWER(book.author) LIKE LOWER(:query)', { query: '%jane%' });
  });

  test('Returns empty list when no authors exist', async () => {
    const dataQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([]),
    };
    const countQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValueOnce({ count: '0' }),
    };
    bookRepository.createQueryBuilder.mockReturnValueOnce(dataQuery).mockReturnValueOnce(countQuery);

    const paginationResult: PaginationResult<AuthorEntity[]> = {
      data: [],
      limit: 10,
      offset: 0,
      total: 0,
      nextCursor: null,
    };

    const result = await service.getAuthors(undefined, 10, 0);

    expect(result).toEqual(paginationResult);
  });
});
