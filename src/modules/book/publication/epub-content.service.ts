import { Injectable, Logger } from '@nestjs/common';
import { basename, join } from 'path';
import { Book } from 'src/modules/book/book.model';
import { EpubArchiveCacheService } from 'src/modules/book/publication/epub-archive-cache.service';

export interface PublicationContentEntry {
  data: Buffer;
  mediaType: string;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  xhtml: 'application/xhtml+xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ncx: 'application/x-dtbncx+xml',
  opf: 'application/oebps-package+xml',
  xml: 'application/xml',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};

@Injectable()
export class EpubContentService {
  private readonly logger = new Logger(EpubContentService.name);

  constructor(private readonly epubArchiveCache: EpubArchiveCacheService) {}

  async getContent(book: Book, entryPath: string): Promise<PublicationContentEntry | null> {
    const epubPath = join('books', basename(book.fileName));

    try {
      const zip = await this.epubArchiveCache.getArchive(epubPath);
      const entry = zip.getEntry(entryPath) ?? zip.getEntry(decodeURIComponent(entryPath));
      if (!entry) return null;

      const data = entry.getData();
      const ext = entryPath.split('.').pop()?.toLowerCase() ?? '';
      const mediaType = MEDIA_TYPE_MAP[ext] ?? 'application/octet-stream';

      return { data, mediaType };
    } catch (e) {
      this.logger.error(`Failed to read entry "${entryPath}" from ${book.fileName}: ${e}`);
      return null;
    }
  }
}
