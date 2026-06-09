export interface BookFileMetadata {
  title?: string;
  author?: string;
  language?: string;
  publisher?: string;
  publishedYear?: number;
  isbn?: string;
  summary?: string;
  genres?: string[];
  series?: string;
  seriesPosition?: number;
  pageCount?: number;
  coverImageBuffer?: Buffer;
  coverImageMimeType?: string;
}
