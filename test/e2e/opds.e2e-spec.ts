import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { OpdsBasicAuthGuard } from 'src/common/guards/opds-basic-auth.guard';
import { BookService } from 'src/modules/book/catalog/book.service';
import { BookShelfService } from 'src/modules/book-shelf/book-shelf.service';
import { OpdsV1Builder } from 'src/modules/opds/opds-v1.builder';
import { OpdsV1Controller } from 'src/modules/opds/opds-v1.controller';
import { OpdsV2Builder } from 'src/modules/opds/opds-v2.builder';
import { OpdsV2Controller } from 'src/modules/opds/opds-v2.controller';

describe('OPDS controllers (e2e)', () => {
  let app: INestApplication<App>;

  const mockBookService = {
    getBooks: jest.fn(),
    getNewArrivals: jest.fn(),
    getDownload: jest.fn(),
  };

  const mockBookShelfService = {
    getBookShelves: jest.fn(),
    getBookShelfById: jest.fn(),
    getBookShelfBooks: jest.fn(),
  };

  const mockOpdsV1Builder = {
    buildCatalogFeed: jest.fn().mockReturnValue('<feed />'),
    buildAllBooksFeed: jest.fn().mockReturnValue('<books />'),
    buildNewArrivalsFeed: jest.fn().mockReturnValue('<new />'),
    buildBookShelvesFeed: jest.fn().mockReturnValue('<shelves />'),
    buildBookShelfFeed: jest.fn().mockReturnValue('<shelf />'),
    buildSearchFeed: jest.fn().mockReturnValue('<search />'),
    buildOpenSearchDescription: jest.fn().mockReturnValue('<open-search />'),
  };

  const mockOpdsV2Builder = {
    buildCatalogFeed: jest.fn().mockReturnValue('{}'),
    buildAllBooksFeed: jest.fn().mockReturnValue('{"all":true}'),
    buildNewArrivalsFeed: jest.fn().mockReturnValue('{"new":true}'),
    buildBookShelvesFeed: jest.fn().mockReturnValue('{"shelves":true}'),
    buildBookShelfFeed: jest.fn().mockReturnValue('{"shelf":true}'),
    buildSearchFeed: jest.fn().mockReturnValue('{"search":true}'),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OpdsV1Controller, OpdsV2Controller],
      providers: [
        { provide: BookService, useValue: mockBookService },
        { provide: BookShelfService, useValue: mockBookShelfService },
        { provide: OpdsV1Builder, useValue: mockOpdsV1Builder },
        { provide: OpdsV2Builder, useValue: mockOpdsV2Builder },
      ],
    })
      .overrideGuard(OpdsBasicAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  test('serves v1 books feed from BookService', async () => {
    mockBookService.getBooks.mockResolvedValueOnce({ data: [], total: 0, limit: 20, offset: 0, nextCursor: null });

    const response = await request(app.getHttpServer()).get('/opds/v1/books').expect(200);

    expect(response.text).toBe('<books />');
    expect(mockBookService.getBooks).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(mockOpdsV1Builder.buildAllBooksFeed).toHaveBeenCalled();
  });

  test('serves v1 new arrivals feed from BookService', async () => {
    mockBookService.getNewArrivals.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      nextCursor: null,
    });

    const response = await request(app.getHttpServer()).get('/opds/v1/books/new').expect(200);

    expect(response.text).toBe('<new />');
    expect(mockBookService.getNewArrivals).toHaveBeenCalledWith(20, 0);
  });

  test('serves v2 search feed from BookService', async () => {
    mockBookService.getBooks.mockResolvedValueOnce({ data: [], total: 0, limit: 20, offset: 0, nextCursor: null });

    const response = await request(app.getHttpServer()).get('/opds/v2/search?q=test').expect(200);

    expect(response.text).toBe('{"search":true}');
    expect(mockBookService.getBooks).toHaveBeenCalledWith({ query: 'test', limit: 20, offset: 0 });
    expect(mockOpdsV2Builder.buildSearchFeed).toHaveBeenCalled();
  });
});
