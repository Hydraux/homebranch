import { Controller, Get, Header, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { OpdsBasicAuthGuard } from 'src/common/guards/opds-basic-auth.guard';
import { OpdsAuthExceptionFilter } from 'src/common/filters/opds-auth-exception.filter';
import { BookService } from 'src/modules/book/catalog/book.service';
import { OpdsV2Builder } from 'src/modules/opds/opds-v2.builder';
import { OPDS_MEDIA_TYPE } from 'src/modules/opds/opds-link.helper';
import { BookShelfService } from 'src/modules/book-shelf/book-shelf.service';

const DEFAULT_LIMIT = 20;

@Controller('opds/v2')
@UseGuards(OpdsBasicAuthGuard)
@UseFilters(OpdsAuthExceptionFilter)
export class OpdsV2Controller {
  constructor(
    private readonly bookService: BookService,
    private readonly bookShelfService: BookShelfService,
    private readonly opdsV2Builder: OpdsV2Builder,
  ) {}

  @Get('catalog')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  getCatalog(): string {
    return this.opdsV2Builder.buildCatalogFeed();
  }

  @Get('books')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  async getAllBooks(@Query('limit') limit?: number, @Query('offset') offset?: number): Promise<string> {
    const books = await this.bookService.getBooks({ limit: limit ?? DEFAULT_LIMIT, offset: offset ?? 0 });
    return this.opdsV2Builder.buildAllBooksFeed(books);
  }

  @Get('books/new')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  async getNewArrivals(@Query('limit') limit?: number, @Query('offset') offset?: number): Promise<string> {
    const books = await this.bookService.getNewArrivals(limit ?? DEFAULT_LIMIT, offset ?? 0);
    return this.opdsV2Builder.buildNewArrivalsFeed(books);
  }

  @Get('bookshelves')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  async getBookshelves(@Query('limit') limit?: number, @Query('offset') offset?: number): Promise<string> {
    const result = await this.bookShelfService.getBookShelves(limit ?? DEFAULT_LIMIT, offset ?? 0);
    return this.opdsV2Builder.buildBookShelvesFeed(result);
  }

  @Get('bookshelves/:id')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  async getBookshelfBooks(@Param('id') id: string): Promise<string> {
    const shelfResult = await this.bookShelfService.getBookShelfById(id);
    const booksResult = await this.bookShelfService.getBookShelfBooks(id);
    return this.opdsV2Builder.buildBookShelfFeed(shelfResult, booksResult);
  }

  @Get('search')
  @Header('Content-Type', OPDS_MEDIA_TYPE.OPDS_JSON)
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<string> {
    const result = await this.bookService.getBooks({
      query: q ?? '',
      limit: limit ?? DEFAULT_LIMIT,
      offset: offset ?? 0,
    });
    return this.opdsV2Builder.buildSearchFeed(result, q ?? '');
  }
}
