import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthorService } from 'src/modules/author/author.service';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { mockAuthorEntity } from 'test/mocks/authorMocks';

describe('AuthorService.updateAuthor', () => {
  let service: AuthorService;
  let authorRepository: jest.Mocked<Repository<AuthorEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorService,
        {
          provide: getRepositoryToken(AuthorEntity),
          useValue: {
            createQueryBuilder: jest.fn(),
            save: jest.fn(),
          },
        },
        { provide: getRepositoryToken(BookEntity), useValue: {} },
        { provide: OpenLibraryGateway, useValue: { enrichAuthor: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthorService>(AuthorService);
    authorRepository = module.get(getRepositoryToken(AuthorEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Successfully updates author biography', async () => {
    const updatedAuthor = { ...mockAuthorEntity, biography: 'Updated biography text.' };
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce({ ...mockAuthorEntity }),
    } as never);
    authorRepository.save.mockResolvedValueOnce(updatedAuthor);

    const result = await service.updateAuthor('Jane Austen', 'Updated biography text.');

    expect(authorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ biography: 'Updated biography text.' }),
    );
    expect(result.biography).toBe('Updated biography text.');
  });

  test('Preserves existing biography when biography is not provided', async () => {
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce({ ...mockAuthorEntity }),
    } as never);
    authorRepository.save.mockResolvedValueOnce(mockAuthorEntity);

    await service.updateAuthor('Jane Austen');

    const updatedAuthorArg = authorRepository.save.mock.calls[0][0];
    expect(updatedAuthorArg.biography).toBe(mockAuthorEntity.biography);
  });

  test('Fails when author is not found', async () => {
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce(null),
    } as never);

    await expect(service.updateAuthor('Unknown Author', 'Some text')).rejects.toBeInstanceOf(NotFoundException);
    expect(authorRepository.save).not.toHaveBeenCalled();
  });
});
