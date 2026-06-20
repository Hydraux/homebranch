import { Inject, Injectable } from '@nestjs/common';
import { BookFileMetadata } from 'src/modules/book/format/book-file-metadata.interface';
import { IStorageService, STORAGE_SERVICE_TOKEN } from 'src/modules/storage/storage.interface';

@Injectable()
export class PdfParserService {
  constructor(@Inject(STORAGE_SERVICE_TOKEN) private readonly storage: IStorageService) {}

  async parse(key: string): Promise<BookFileMetadata> {
    const { buffer } = await this.storage.getFileBuffer(key);
    const content = buffer.toString('latin1');
    const metadata: BookFileMetadata = {};

    const title = this.extractInfoValue(content, 'Title');
    if (title) metadata.title = title;

    const author = this.extractInfoValue(content, 'Author');
    if (author) metadata.author = author;

    const subject = this.extractInfoValue(content, 'Subject');
    if (subject) metadata.summary = subject;

    const keywords = this.extractInfoValue(content, 'Keywords');
    if (keywords) {
      metadata.genres = keywords
        .split(/[;,]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 5);
    }

    const publisher = this.extractInfoValue(content, 'Publisher') ?? this.extractInfoValue(content, 'Producer');
    if (publisher) metadata.publisher = publisher;

    const creationDate = this.extractInfoValue(content, 'CreationDate');
    if (creationDate) {
      const yearMatch = creationDate.match(/(\d{4})/);
      if (yearMatch) {
        const year = Number(yearMatch[1]);
        if (!Number.isNaN(year)) metadata.publishedYear = year;
      }
    }

    const pageCounts = [...content.matchAll(/\/Count\s+(\d+)/g)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (pageCounts.length > 0) {
      metadata.pageCount = Math.max(...pageCounts);
    }

    return metadata;
  }

  private extractInfoValue(content: string, key: string): string | undefined {
    const literalMatch = content.match(new RegExp(`/${key}\\s*\\(([^)]*)\\)`, 'i'));
    if (literalMatch?.[1]) {
      return this.decodePdfString(literalMatch[1]);
    }

    const hexMatch = content.match(new RegExp(`/${key}\\s*<([0-9A-Fa-f]+)>`, 'i'));
    if (hexMatch?.[1]) {
      return this.decodePdfHexString(hexMatch[1]);
    }

    return undefined;
  }

  private decodePdfString(value: string): string {
    return value
      .replace(/\\([nrtbf()\\])/g, (_match, escaped: string) => {
        switch (escaped) {
          case 'n':
            return '\n';
          case 'r':
            return '\r';
          case 't':
            return '\t';
          case 'b':
            return '\b';
          case 'f':
            return '\f';
          default:
            return escaped;
        }
      })
      .replace(/\\(\d{3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)))
      .trim();
  }

  private decodePdfHexString(value: string): string {
    const normalized = value.length % 2 === 0 ? value : `${value}0`;
    const buffer = Buffer.from(normalized, 'hex');
    let decoded: string;
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.from(buffer.subarray(2));
      for (let i = 0; i + 1 < swapped.length; i += 2) {
        const current = swapped[i];
        swapped[i] = swapped[i + 1];
        swapped[i + 1] = current;
      }
      decoded = swapped.toString('utf16le');
    } else {
      decoded = buffer.toString('utf8');
    }
    return decoded.replace(/\0/g, '').trim();
  }
}
