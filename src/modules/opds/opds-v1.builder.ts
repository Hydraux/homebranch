import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { Book } from 'src/modules/book/book.model';
import { BookShelfEntity } from 'src/modules/book-shelf/book-shelf.entity';
import { PaginationResult } from 'src/common/core/pagination_result';
import { OPDS_LINK_REL, OPDS_MEDIA_TYPE } from 'src/modules/opds/opds-link.helper';

@Injectable()
export class OpdsV1Builder {
  private feedHeader(feed: XMLBuilder, selfHref: string, title: string, feedId: string) {
    feed
      .ele('id')
      .txt(`urn:uuid:homebranch-${feedId}`)
      .up()
      .ele('title')
      .txt(title)
      .up()
      .ele('updated')
      .txt(new Date().toISOString())
      .up()
      .ele('author')
      .ele('name')
      .txt('Homebranch')
      .up()
      .up()
      .ele('link', { rel: OPDS_LINK_REL.SELF, href: selfHref, type: OPDS_MEDIA_TYPE.NAVIGATION })
      .up()
      .ele('link', { rel: OPDS_LINK_REL.START, href: '/opds/v1/catalog', type: OPDS_MEDIA_TYPE.NAVIGATION })
      .up()
      .ele('link', { rel: OPDS_LINK_REL.SEARCH, href: '/opds/v1/opensearch.xml', type: OPDS_MEDIA_TYPE.OPENSEARCH })
      .up();
  }

  private paginationLinks(feed: XMLBuilder, basePath: string, result: PaginationResult<unknown[]>) {
    const { limit, offset, total } = result;
    const lim = limit ?? 20;
    const off = offset ?? 0;
    if (off > 0) {
      const prevOffset = Math.max(0, off - lim);
      feed
        .ele('link', {
          rel: OPDS_LINK_REL.PREVIOUS,
          href: `${basePath}?limit=${lim}&offset=${prevOffset}`,
          type: OPDS_MEDIA_TYPE.ACQUISITION,
        })
        .up();
    }
    if (total !== undefined && total > off + lim) {
      feed
        .ele('link', {
          rel: OPDS_LINK_REL.NEXT,
          href: `${basePath}?limit=${lim}&offset=${off + lim}`,
          type: OPDS_MEDIA_TYPE.ACQUISITION,
        })
        .up();
    }
  }

  private bookEntry(feed: XMLBuilder, book: Book) {
    const entry = feed.ele('entry');
    entry.ele('id').txt(`urn:uuid:${book.id}`).up();
    entry.ele('title').txt(book.title).up();
    entry
      .ele('updated')
      .txt(book.createdAt?.toISOString() ?? new Date().toISOString())
      .up();
    entry.ele('author').ele('name').txt(book.author).up().up();

    if (book.summary) {
      entry.ele('summary', { type: 'text' }).txt(book.summary).up();
    }
    if (book.language) {
      entry.ele('dc:language').txt(book.language).up();
    }
    if (book.publisher) {
      entry.ele('dc:publisher').txt(book.publisher).up();
    }
    if (book.publishedYear) {
      entry.ele('dc:issued').txt(String(book.publishedYear)).up();
    }
    if (book.isbn) {
      entry.ele('dc:identifier').txt(`urn:isbn:${book.isbn}`).up();
    }
    for (const genre of book.genres ?? []) {
      if (genre) entry.ele('category', { label: genre, term: genre }).up();
    }
    if (book.coverImageFileName) {
      entry
        .ele('link', {
          rel: OPDS_LINK_REL.THUMBNAIL,
          href: `/uploads/cover-images/${book.coverImageFileName}`,
          type: OPDS_MEDIA_TYPE.JPEG,
        })
        .up();
    }
    entry
      .ele('link', {
        rel: OPDS_LINK_REL.ACQUISITION,
        href: `/opds/v1/download/${book.id}`,
        type: OPDS_MEDIA_TYPE.EPUB,
      })
      .up();
  }

  private buildFeedDoc(namespaces: Record<string, string>) {
    return create({ version: '1.0', encoding: 'UTF-8' }).ele('feed', {
      xmlns: 'http://www.w3.org/2005/Atom',
      ...namespaces,
    });
  }

  private dcNamespaces() {
    return {
      'xmlns:opds': 'http://opds-spec.org/2010/catalog',
      'xmlns:dc': 'http://purl.org/dc/terms/',
      'xmlns:os': 'http://a9.com/-/spec/opensearch/1.1/',
    };
  }

  buildCatalogFeed(): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, '/opds/v1/catalog', 'Homebranch Catalog', 'catalog');

    feed
      .ele('entry')
      .ele('id')
      .txt('urn:uuid:homebranch-all-books')
      .up()
      .ele('title')
      .txt('All Books')
      .up()
      .ele('updated')
      .txt(new Date().toISOString())
      .up()
      .ele('content', { type: 'text' })
      .txt('Browse all books')
      .up()
      .ele('link', { rel: OPDS_LINK_REL.SUBSECTION, href: '/opds/v1/books', type: OPDS_MEDIA_TYPE.ACQUISITION })
      .up()
      .up();

    feed
      .ele('entry')
      .ele('id')
      .txt('urn:uuid:homebranch-new-arrivals')
      .up()
      .ele('title')
      .txt('New Arrivals')
      .up()
      .ele('updated')
      .txt(new Date().toISOString())
      .up()
      .ele('content', { type: 'text' })
      .txt('Recently added books')
      .up()
      .ele('link', { rel: OPDS_LINK_REL.SUBSECTION, href: '/opds/v1/books/new', type: OPDS_MEDIA_TYPE.ACQUISITION })
      .up()
      .up();

    feed
      .ele('entry')
      .ele('id')
      .txt('urn:uuid:homebranch-bookshelves')
      .up()
      .ele('title')
      .txt('Bookshelves')
      .up()
      .ele('updated')
      .txt(new Date().toISOString())
      .up()
      .ele('content', { type: 'text' })
      .txt('Browse bookshelves')
      .up()
      .ele('link', { rel: OPDS_LINK_REL.SUBSECTION, href: '/opds/v1/bookshelves', type: OPDS_MEDIA_TYPE.NAVIGATION })
      .up()
      .up();

    return feed.doc().end({ prettyPrint: false });
  }

  buildAllBooksFeed(result: PaginationResult<Book[]>): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, '/opds/v1/books', 'All Books', 'all-books');
    this.paginationLinks(feed, '/opds/v1/books', result);
    for (const book of result.data) this.bookEntry(feed, book);
    return feed.doc().end({ prettyPrint: false });
  }

  buildNewArrivalsFeed(result: PaginationResult<Book[]>): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, '/opds/v1/books/new', 'New Arrivals', 'new-arrivals');
    this.paginationLinks(feed, '/opds/v1/books/new', result);
    for (const book of result.data) this.bookEntry(feed, book);
    return feed.doc().end({ prettyPrint: false });
  }

  buildBookShelvesFeed(result: PaginationResult<BookShelfEntity[]>): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, '/opds/v1/bookshelves', 'Bookshelves', 'bookshelves');

    for (const shelf of result.data) {
      feed
        .ele('entry')
        .ele('id')
        .txt(`urn:uuid:homebranch-shelf-${shelf.id}`)
        .up()
        .ele('title')
        .txt(shelf.title)
        .up()
        .ele('updated')
        .txt(new Date().toISOString())
        .up()
        .ele('content', { type: 'text' })
        .txt(`Books in ${shelf.title}`)
        .up()
        .ele('link', {
          rel: OPDS_LINK_REL.SUBSECTION,
          href: `/opds/v1/bookshelves/${shelf.id}`,
          type: OPDS_MEDIA_TYPE.ACQUISITION,
        })
        .up()
        .up();
    }
    return feed.doc().end({ prettyPrint: false });
  }

  buildBookShelfFeed(shelf: BookShelfEntity, result: PaginationResult<Book[]>): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, `/opds/v1/bookshelves/${shelf.id}`, shelf.title, `shelf-${shelf.id}`);
    this.paginationLinks(feed, `/opds/v1/bookshelves/${shelf.id}`, result);
    for (const book of result.data) this.bookEntry(feed, book);
    return feed.doc().end({ prettyPrint: false });
  }

  buildSearchFeed(result: PaginationResult<Book[]>, query: string): string {
    const feed = this.buildFeedDoc(this.dcNamespaces());
    this.feedHeader(feed, `/opds/v1/search?q=${encodeURIComponent(query)}`, `Search: ${query}`, 'search');
    this.paginationLinks(feed, `/opds/v1/search?q=${encodeURIComponent(query)}`, result);
    for (const book of result.data) this.bookEntry(feed, book);
    return feed.doc().end({ prettyPrint: false });
  }

  buildOpenSearchDescription(): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('OpenSearchDescription', { xmlns: 'http://a9.com/-/spec/opensearch/1.1/' })
      .ele('ShortName')
      .txt('Homebranch')
      .up()
      .ele('Description')
      .txt('Search the Homebranch catalog')
      .up()
      .ele('InputEncoding')
      .txt('UTF-8')
      .up()
      .ele('Url', {
        type: OPDS_MEDIA_TYPE.ACQUISITION,
        template: '/opds/v1/search?q={searchTerms}',
      })
      .up()
      .doc();
    return doc.end({ prettyPrint: false });
  }
}
