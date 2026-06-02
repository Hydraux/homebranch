import { Injectable, Logger } from '@nestjs/common';
import { Book } from 'src/modules/book/book.model';
import { AuthorEntity } from 'src/modules/author/author.entity';
import { SettingsService } from 'src/modules/settings/settings.service';

interface GoogleBooksIndustryIdentifier {
  type: string;
  identifier: string;
}

interface GoogleBooksVolumeInfo {
  publisher?: string;
  pageCount?: number;
  language?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  description?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  seriesInfo?: {
    shortSeriesBookTitle?: string;
    bookDisplayNumber?: string;
  };
}

interface GoogleBooksItem {
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

const FIELDS =
  'items(volumeInfo(publisher,pageCount,language,categories,averageRating,ratingsCount,description,industryIdentifiers,seriesInfo))';

@Injectable()
export class GoogleBooksGateway {
  private readonly logger = new Logger(GoogleBooksGateway.name);
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  private readonly timeoutMs = 8000;

  constructor(private readonly settingsService: SettingsService) {}

  private createAbortSignal(): AbortSignal {
    return AbortSignal.timeout(this.timeoutMs);
  }

  private async resolveApiKey(): Promise<string | undefined> {
    const configuredApiKey = await this.settingsService.getOptionalValue('google_books_api_key');
    return configuredApiKey ?? process.env.GOOGLE_BOOKS_API_KEY;
  }

  async enrichBook(book: Book): Promise<Book> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      this.logger.log(`Skipping Google Books for "${book.title}": no API key configured`);
      return book;
    }

    try {
      const volumeInfo = await this.fetchVolumeInfo(book, apiKey);
      if (!volumeInfo) {
        this.logger.log(`No Google Books result for "${book.title}"`);
        return book;
      }

      let enriched = false;

      if (!book.isbn) {
        const isbn =
          volumeInfo.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier ??
          volumeInfo.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier;
        if (isbn) {
          book.isbn = isbn;
          enriched = true;
        }
      }
      if (!book.pageCount && volumeInfo.pageCount) {
        book.pageCount = volumeInfo.pageCount;
        enriched = true;
      }
      if (!book.publisher && volumeInfo.publisher) {
        book.publisher = volumeInfo.publisher;
        enriched = true;
      }
      if (!book.language && volumeInfo.language) {
        book.language = volumeInfo.language;
        enriched = true;
      }
      if (!book.genres?.length && volumeInfo.categories?.length) {
        book.genres = volumeInfo.categories.slice(0, 5);
        enriched = true;
      }
      if (!book.averageRating && volumeInfo.averageRating) {
        book.averageRating = volumeInfo.averageRating;
        enriched = true;
      }
      if (!book.ratingsCount && volumeInfo.ratingsCount) {
        book.ratingsCount = volumeInfo.ratingsCount;
        enriched = true;
      }
      if (!book.summary && volumeInfo.description) {
        book.summary = volumeInfo.description;
        enriched = true;
      }
      if (!book.series && volumeInfo.seriesInfo?.shortSeriesBookTitle) {
        book.series = volumeInfo.seriesInfo.shortSeriesBookTitle;
        if (volumeInfo.seriesInfo.bookDisplayNumber) {
          const position = parseInt(volumeInfo.seriesInfo.bookDisplayNumber);
          book.seriesPosition = isNaN(position) ? undefined : position;
        }
        enriched = true;
      }

      if (enriched) {
        this.logger.log(`Enriched "${book.title}" from Google Books`);
      } else {
        this.logger.log(`No new metadata from Google Books for "${book.title}"`);
      }

      return book;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch metadata for "${book.title}" from Google Books: ${error instanceof Error ? error.message : String(error)}`,
      );
      return book;
    }
  }

  private async fetchVolumeInfo(book: Book, apiKey: string): Promise<GoogleBooksVolumeInfo | null> {
    const query = book.isbn
      ? `isbn:${encodeURIComponent(book.isbn)}`
      : `intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}`;

    const url = `${this.baseUrl}/volumes?q=${query}&maxResults=1&fields=${FIELDS}&key=${apiKey}`;
    const response = await fetch(url, { signal: this.createAbortSignal() });

    if (!response.ok) {
      this.logger.warn(`Google Books API returned ${response.status} for "${book.title}"`);
      return null;
    }

    const data = (await response.json()) as GoogleBooksResponse;
    return data.items?.at(0)?.volumeInfo ?? null;
  }

  enrichAuthor(author: AuthorEntity): Promise<AuthorEntity> {
    return Promise.resolve(author);
  }

  async fetchSummary(book: Book): Promise<string | null> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return null;
    }
    try {
      const volumeInfo = await this.fetchVolumeInfo(book, apiKey);
      return volumeInfo?.description ?? null;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch summary for "${book.title}" from Google Books: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
