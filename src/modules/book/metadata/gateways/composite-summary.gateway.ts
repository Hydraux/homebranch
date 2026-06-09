import { Injectable } from '@nestjs/common';
import { GoogleBooksGateway } from 'src/common/gateways/google-books.gateway';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { Book } from 'src/modules/book/book.model';

@Injectable()
export class CompositeSummaryGateway {
  constructor(
    private readonly openLibraryGateway: OpenLibraryGateway,
    private readonly googleBooksGateway: GoogleBooksGateway,
  ) {}

  async fetchSummary(book: Book): Promise<string | null> {
    const openLibrarySummary = await this.openLibraryGateway.fetchSummary(book);
    if (openLibrarySummary) {
      return openLibrarySummary;
    }
    return this.googleBooksGateway.fetchSummary(book);
  }
}
