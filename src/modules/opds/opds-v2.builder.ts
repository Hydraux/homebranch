import { Injectable } from '@nestjs/common';
import { Book } from 'src/modules/book/book.model';
import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { PaginationResult } from 'src/common/core/pagination_result';
import { OPDS_LINK_REL, OPDS_MEDIA_TYPE } from 'src/modules/opds/opds-link.helper';

interface OpdsLink {
  rel: string;
  href: string;
  type: string;
  title?: string;
}

interface OpdsV2Feed {
  metadata: Record<string, unknown>;
  links: OpdsLink[];
  navigation?: Array<{ title: string; href: string; type: string; rel: string }>;
  publications?: Array<Record<string, unknown>>;
}

@Injectable()
export class OpdsV2Builder {
  private baseLinks(selfHref: string): OpdsLink[] {
    return [
      { rel: OPDS_LINK_REL.SELF, href: selfHref, type: OPDS_MEDIA_TYPE.OPDS_JSON },
      { rel: OPDS_LINK_REL.START, href: '/opds/v2/catalog', type: OPDS_MEDIA_TYPE.OPDS_JSON },
      { rel: OPDS_LINK_REL.SEARCH, href: '/opds/v2/search{?q}', type: OPDS_MEDIA_TYPE.OPDS_JSON, title: 'Search' },
    ];
  }

  private paginationLinks(basePath: string, result: PaginationResult<unknown[]>): OpdsLink[] {
    const links: OpdsLink[] = [];
    const lim = result.limit ?? 20;
    const off = result.offset ?? 0;
    if (off > 0) {
      const prevOffset = Math.max(0, off - lim);
      links.push({
        rel: OPDS_LINK_REL.PREVIOUS,
        href: `${basePath}?limit=${lim}&offset=${prevOffset}`,
        type: OPDS_MEDIA_TYPE.OPDS_JSON,
      });
    }
    if (result.total !== undefined && result.total > off + lim) {
      links.push({
        rel: OPDS_LINK_REL.NEXT,
        href: `${basePath}?limit=${lim}&offset=${off + lim}`,
        type: OPDS_MEDIA_TYPE.OPDS_JSON,
      });
    }
    return links;
  }

  private bookPublication(book: Book): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      '@type': 'http://schema.org/Book',
      title: book.title,
      author: [{ name: book.author }],
    };
    if (book.language) metadata.language = book.language;
    if (book.publisher) metadata.publisher = book.publisher;
    if (book.publishedYear) metadata.published = String(book.publishedYear);
    if (book.isbn) metadata.identifier = `urn:isbn:${book.isbn}`;
    if (book.summary) metadata.description = book.summary;
    if (book.pageCount) metadata.numberOfPages = book.pageCount;
    if (book.genres?.length) metadata.subject = book.genres.filter(Boolean);

    const links: OpdsLink[] = [
      { rel: OPDS_LINK_REL.ACQUISITION, href: `/opds/v1/download/${book.id}`, type: OPDS_MEDIA_TYPE.EPUB },
    ];

    const images: Array<{ href: string; type: string }> = [];
    if (book.coverImageFileName) {
      images.push({ href: `/uploads/cover-images/${book.coverImageFileName}`, type: OPDS_MEDIA_TYPE.JPEG });
    }

    return { metadata, links, images };
  }

  buildCatalogFeed(): string {
    const feed: OpdsV2Feed = {
      metadata: { title: 'Homebranch Catalog' },
      links: this.baseLinks('/opds/v2/catalog'),
      navigation: [
        { title: 'All Books', href: '/opds/v2/books', type: OPDS_MEDIA_TYPE.OPDS_JSON, rel: OPDS_LINK_REL.SUBSECTION },
        {
          title: 'New Arrivals',
          href: '/opds/v2/books/new',
          type: OPDS_MEDIA_TYPE.OPDS_JSON,
          rel: OPDS_LINK_REL.SUBSECTION,
        },
        {
          title: 'Bookshelves',
          href: '/opds/v2/bookshelves',
          type: OPDS_MEDIA_TYPE.OPDS_JSON,
          rel: OPDS_LINK_REL.SUBSECTION,
        },
      ],
    };
    return JSON.stringify(feed);
  }

  buildAllBooksFeed(result: PaginationResult<Book[]>): string {
    const feed: OpdsV2Feed = {
      metadata: {
        title: 'All Books',
        numberOfItems: result.total,
        itemsPerPage: result.limit ?? 20,
      },
      links: [...this.baseLinks('/opds/v2/books'), ...this.paginationLinks('/opds/v2/books', result)],
      publications: result.data.map((b) => this.bookPublication(b)),
    };
    return JSON.stringify(feed);
  }

  buildNewArrivalsFeed(result: PaginationResult<Book[]>): string {
    const feed: OpdsV2Feed = {
      metadata: {
        title: 'New Arrivals',
        numberOfItems: result.total,
        itemsPerPage: result.limit ?? 20,
      },
      links: [...this.baseLinks('/opds/v2/books/new'), ...this.paginationLinks('/opds/v2/books/new', result)],
      publications: result.data.map((b) => this.bookPublication(b)),
    };
    return JSON.stringify(feed);
  }

  buildBookShelvesFeed(result: PaginationResult<BookShelfEntity[]>): string {
    const feed: OpdsV2Feed = {
      metadata: {
        title: 'Bookshelves',
        numberOfItems: result.total,
        itemsPerPage: result.limit ?? 20,
      },
      links: [...this.baseLinks('/opds/v2/bookshelves'), ...this.paginationLinks('/opds/v2/bookshelves', result)],
      navigation: result.data.map((shelf) => ({
        title: shelf.title,
        href: `/opds/v2/bookshelves/${shelf.id}`,
        type: OPDS_MEDIA_TYPE.OPDS_JSON,
        rel: OPDS_LINK_REL.SUBSECTION,
      })),
    };
    return JSON.stringify(feed);
  }

  buildBookShelfFeed(shelf: BookShelfEntity, result: PaginationResult<Book[]>): string {
    const feed: OpdsV2Feed = {
      metadata: {
        title: shelf.title,
        numberOfItems: result.total,
        itemsPerPage: result.limit ?? 20,
      },
      links: [
        ...this.baseLinks(`/opds/v2/bookshelves/${shelf.id}`),
        ...this.paginationLinks(`/opds/v2/bookshelves/${shelf.id}`, result),
      ],
      publications: result.data.map((b) => this.bookPublication(b)),
    };
    return JSON.stringify(feed);
  }

  buildSearchFeed(result: PaginationResult<Book[]>, query: string): string {
    const searchHref = `/opds/v2/search?q=${encodeURIComponent(query)}`;
    const feed: OpdsV2Feed = {
      metadata: {
        title: `Search: ${query}`,
        numberOfItems: result.total,
        itemsPerPage: result.limit ?? 20,
      },
      links: [...this.baseLinks(searchHref), ...this.paginationLinks(searchHref, result)],
      publications: result.data.map((b) => this.bookPublication(b)),
    };
    return JSON.stringify(feed);
  }
}
