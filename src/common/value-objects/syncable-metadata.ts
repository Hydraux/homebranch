export interface SyncableMetadata {
  title: string;
  author: string;
  language?: string;
  publisher?: string;
  publishedYear?: number;
  isbn?: string;
  summary?: string;
  genres?: string[];
  series?: string;
  seriesPosition?: number;
}

export class SyncableMetadataHelper {
  static fromBook(book: {
    title: string;
    author: string;
    language?: string;
    publisher?: string;
    publishedYear?: number;
    isbn?: string;
    summary?: string;
    genres?: string[];
    series?: string;
    seriesPosition?: number;
  }): SyncableMetadata {
    return {
      title: book.title,
      author: book.author,
      language: book.language,
      publisher: book.publisher,
      publishedYear: book.publishedYear,
      isbn: book.isbn,
      summary: book.summary,
      genres: book.genres,
      series: book.series,
      seriesPosition: book.seriesPosition,
    };
  }

  static equals(a: SyncableMetadata, b: SyncableMetadata): boolean {
    return (
      a.title === b.title &&
      a.author === b.author &&
      a.language === b.language &&
      a.publisher === b.publisher &&
      a.publishedYear === b.publishedYear &&
      a.isbn === b.isbn &&
      a.summary === b.summary &&
      a.series === b.series &&
      a.seriesPosition === b.seriesPosition &&
      JSON.stringify(a.genres?.sort()) === JSON.stringify(b.genres?.sort())
    );
  }
}
