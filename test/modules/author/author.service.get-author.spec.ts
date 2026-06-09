import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorService } from 'src/modules/author/author.service';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { BookEntity } from 'src/modules/book/book.entity';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { mockAuthorEntity, mockAuthorEntityWithoutEnrichment } from 'test/mocks/authorMocks';

describe('AuthorService.getAuthor', () => {
  let service: AuthorService;
  let authorRepository: jest.Mocked<Repository<AuthorEntity>>;
  let metadataGateway: jest.Mocked<OpenLibraryGateway>;

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
        {
          provide: getRepositoryToken(BookEntity),
          useValue: {},
        },
        {
          provide: OpenLibraryGateway,
          useValue: {
            enrichAuthor: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorService>(AuthorService);
    authorRepository = module.get(getRepositoryToken(AuthorEntity));
    metadataGateway = module.get(OpenLibraryGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Returns existing author record when found', async () => {
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce(mockAuthorEntity),
    } as never);

    const result = await service.getAuthor('Jane Austen');

    expect(authorRepository.createQueryBuilder).toHaveBeenCalledWith('author');
    expect(metadataGateway.enrichAuthor).not.toHaveBeenCalled();
    expect(authorRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(mockAuthorEntity);
  });

  test('Creates a new author with Open Library enrichment when not found', async () => {
    const enrichedAuthor = {
      ...mockAuthorEntity,
      biography: 'An English novelist.',
      profilePictureUrl: 'https://covers.openlibrary.org/a/olid/OL21594A-L.jpg',
    };
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce(null),
    } as never);
    metadataGateway.enrichAuthor.mockResolvedValueOnce(enrichedAuthor as AuthorEntity);
    authorRepository.save.mockResolvedValueOnce(mockAuthorEntity);

    const result = await service.getAuthor('Jane Austen');

    expect(metadataGateway.enrichAuthor).toHaveBeenCalledTimes(1);
    expect(authorRepository.save).toHaveBeenCalledTimes(1);
    const createdAuthor = authorRepository.save.mock.calls[0][0];
    expect(createdAuthor.name).toBe('Jane Austen');
    expect(createdAuthor.biography).toBe('An English novelist.');
    expect(createdAuthor.profilePictureUrl).toBe('https://covers.openlibrary.org/a/olid/OL21594A-L.jpg');
    expect(result).toEqual(mockAuthorEntity);
  });

  test('Creates a new author without enrichment when metadata gateway returns nothing', async () => {
    authorRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce(null),
    } as never);
    metadataGateway.enrichAuthor.mockResolvedValueOnce(mockAuthorEntityWithoutEnrichment);
    authorRepository.save.mockResolvedValueOnce(mockAuthorEntityWithoutEnrichment);

    const result = await service.getAuthor('Charles Dickens');

    const createdAuthor = authorRepository.save.mock.calls[0][0];
    expect(createdAuthor.biography).toBeNull();
    expect(createdAuthor.profilePictureUrl).toBeNull();
    expect(result).toEqual(mockAuthorEntityWithoutEnrichment);
  });
});
