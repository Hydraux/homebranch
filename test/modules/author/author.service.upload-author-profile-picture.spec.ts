import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthorService } from 'src/modules/author/author.service';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { mockAuthorEntity } from 'test/mocks/authorMocks';

describe('AuthorService.uploadProfilePicture', () => {
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

  test('Successfully updates author profile picture URL', async () => {
    const newUrl = 'http://localhost:3000/uploads/author-images/new-uuid.jpg';
    const updatedAuthor = { ...mockAuthorEntity, profilePictureUrl: newUrl };
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce({ ...mockAuthorEntity }),
    } as never);
    authorRepository.save.mockResolvedValueOnce(updatedAuthor);

    const result = await service.uploadProfilePicture('Jane Austen', newUrl);

    expect(authorRepository.save).toHaveBeenCalledWith(expect.objectContaining({ profilePictureUrl: newUrl }));
    expect(result.profilePictureUrl).toBe(newUrl);
  });

  test('Preserves existing biography when updating profile picture', async () => {
    const newUrl = 'http://localhost:3000/uploads/author-images/new-uuid.jpg';
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce({ ...mockAuthorEntity }),
    } as never);
    authorRepository.save.mockResolvedValueOnce(mockAuthorEntity);

    await service.uploadProfilePicture('Jane Austen', newUrl);

    const updatedAuthorArg = authorRepository.save.mock.calls[0][0];
    expect(updatedAuthorArg.biography).toBe(mockAuthorEntity.biography);
  });

  test('Fails when author is not found', async () => {
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce(null),
    } as never);

    await expect(
      service.uploadProfilePicture('Unknown Author', 'http://localhost:3000/uploads/author-images/uuid.jpg'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(authorRepository.save).not.toHaveBeenCalled();
  });
});
