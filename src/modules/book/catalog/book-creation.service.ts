import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { basename, join } from 'path';
import { CreateBookRequest } from 'src/modules/book/dto/create-book-request';
import { CompositeMetadataGateway } from 'src/modules/book/metadata/gateways/composite-metadata.gateway';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { FileService } from 'src/modules/book/format/file.service';
import { BookFormatProcessingService } from 'src/modules/book/format/book-format-processing.service';
import { fillBookMetadataFromFileName } from 'src/modules/book/format/book-file-metadata';
import { buildBookFormatMetadata } from 'src/modules/book/format/book-format-metadata';
import { FileNameGenerator } from 'src/common/utils/filename-generator';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import {
  detectBookFormatFromFileName,
  getBookFormatExtension,
  getPreferredBookFormat,
} from 'src/modules/book/format/book-format';
import { Book, copyBook } from 'src/modules/book/book.model';
import { logicalBookMatches, metadataMatches } from 'src/modules/book/deduplication/book-deduplication.service';
import { BookDuplicateRegistrationService } from 'src/modules/book/deduplication/book-duplicate-registration.service';
import { BookFileMetadata } from 'src/modules/book/format/book-file-metadata.interface';
import { randomUUID } from 'crypto';
import { BookPersistenceService } from 'src/modules/book/persistence/book.persistence';

export type CreateBookResponse = Book | { skipped: true; existingBook: Book };

@Injectable()
export class BookCreationService {
  private readonly logger = new Logger(BookCreationService.name);

  constructor(
    private readonly duplicateRegistrationService: BookDuplicateRegistrationService,
    private readonly metadataGateway: CompositeMetadataGateway,
    private readonly contentHashService: ContentHashService,
    private readonly fileService: FileService,
    private readonly bookFormatProcessingService: BookFormatProcessingService,
    private readonly bookPersistenceService: BookPersistenceService,
  ) {}

  async createBook(dto: CreateBookRequest): Promise<CreateBookResponse> {
    const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';
    const incomingPath = join(uploadsDirectory, 'incoming', basename(dto.fileName));

    const enrichedDto = { ...dto };
    const detectedFormat = detectBookFormatFromFileName(dto.fileName);
    if (!detectedFormat) {
      this.throwMissingMetadata('format');
    }

    let parsedSummary: string | undefined;
    let extractedCoverFileName: string | undefined;
    let fileMetadata: BookFileMetadata = {};

    try {
      fileMetadata = await this.bookFormatProcessingService.parseMetadata(incomingPath, detectedFormat);

      if (!enrichedDto.title && fileMetadata.title) enrichedDto.title = fileMetadata.title;
      if (!enrichedDto.author && fileMetadata.author) enrichedDto.author = fileMetadata.author;
      if (!enrichedDto.language && fileMetadata.language) enrichedDto.language = fileMetadata.language;
      if (!enrichedDto.publisher && fileMetadata.publisher) enrichedDto.publisher = fileMetadata.publisher;
      if (!enrichedDto.publishedYear && fileMetadata.publishedYear) {
        enrichedDto.publishedYear = String(fileMetadata.publishedYear);
      }
      if (!enrichedDto.isbn && fileMetadata.isbn) enrichedDto.isbn = fileMetadata.isbn;
      if (fileMetadata.summary) parsedSummary = fileMetadata.summary;
      if (!enrichedDto.genres?.length && fileMetadata.genres?.length) enrichedDto.genres = fileMetadata.genres;
      if (!enrichedDto.series && fileMetadata.series) enrichedDto.series = fileMetadata.series;
      if (!enrichedDto.seriesPosition && fileMetadata.seriesPosition) {
        enrichedDto.seriesPosition = fileMetadata.seriesPosition;
      }
      if (!enrichedDto.pageCount && fileMetadata.pageCount) enrichedDto.pageCount = fileMetadata.pageCount;

      if (!enrichedDto.coverImageFileName && fileMetadata.coverImageBuffer) {
        const coverFileName = `${randomUUID()}.jpg`;
        const coverPath = join(uploadsDirectory, 'cover-images', coverFileName);
        await this.fileService.writeFile(coverPath, fileMetadata.coverImageBuffer);
        enrichedDto.coverImageFileName = coverFileName;
        extractedCoverFileName = coverFileName;
      }
    } catch (error) {
      this.logger.warn(`Could not parse file metadata for "${dto.fileName}": ${String(error)}`);
    }

    fillBookMetadataFromFileName(enrichedDto, dto.originalFileName ?? dto.fileName);

    if (!enrichedDto.title) {
      this.throwMissingMetadata('title');
    }
    if (!enrichedDto.author) {
      this.throwMissingMetadata('author');
    }

    const preferredBook = await this.findMatchingBook(enrichedDto.title, enrichedDto.author, enrichedDto.isbn);
    const contentHash = await this.contentHashService.computeHash(incomingPath);
    const existingByHash = await this.bookPersistenceService.findBookByContentHash(contentHash);

    if (
      existingByHash &&
      metadataMatches(existingByHash, { title: enrichedDto.title, author: enrichedDto.author, isbn: enrichedDto.isbn })
    ) {
      await this.deleteIncomingFiles(uploadsDirectory, dto.fileName, dto.coverImageFileName, extractedCoverFileName);
      return { skipped: true, existingBook: existingByHash };
    }

    if (preferredBook?.formats?.some((format) => format.format === detectedFormat)) {
      await this.deleteIncomingFiles(uploadsDirectory, dto.fileName, dto.coverImageFileName, extractedCoverFileName);
      return { skipped: true, existingBook: preferredBook };
    }

    const desiredFileName = FileNameGenerator.generate(
      enrichedDto.author,
      enrichedDto.title,
      getBookFormatExtension(detectedFormat),
    );
    const finalFileName = this.resolveUniqueFileName(uploadsDirectory, desiredFileName);
    enrichedDto.fileName = finalFileName;
    const newFormat = Object.assign(new BookFormatEntity(), {
      id: randomUUID(),
      format: detectedFormat,
      fileName: finalFileName,
      fileContentHash: contentHash,
      ...buildBookFormatMetadata(fileMetadata, dto.originalFileName ?? dto.fileName, enrichedDto.coverImageFileName),
    });

    if (preferredBook) {
      const updatedFormats = [...(preferredBook.formats ?? []), newFormat];
      const preferredFormat = getPreferredBookFormat(updatedFormats);
      const updatedBook = copyBook(preferredBook, {
        title: preferredBook.title || enrichedDto.title,
        author: preferredBook.author || enrichedDto.author,
        coverImageFileName: preferredBook.coverImageFileName ?? enrichedDto.coverImageFileName,
        summary: preferredBook.summary ?? parsedSummary,
        genres: preferredBook.genres?.length ? preferredBook.genres : enrichedDto.genres,
        publishedYear: preferredBook.publishedYear ?? this.parseYear(enrichedDto.publishedYear ?? ''),
        uploadedByUserId: preferredBook.uploadedByUserId ?? enrichedDto.uploadedByUserId,
        series: preferredBook.series ?? enrichedDto.series,
        seriesPosition: preferredBook.seriesPosition ?? enrichedDto.seriesPosition,
        isbn: preferredBook.isbn ?? enrichedDto.isbn,
        pageCount: preferredBook.pageCount ?? enrichedDto.pageCount,
        publisher: preferredBook.publisher ?? enrichedDto.publisher,
        language: preferredBook.language ?? enrichedDto.language,
        fileName: preferredFormat?.fileName ?? preferredBook.fileName,
        fileMtime: preferredFormat?.fileMtime ?? preferredBook.fileMtime,
        fileContentHash: preferredFormat?.fileContentHash ?? preferredBook.fileContentHash,
        formats: updatedFormats,
      });

      const persistedBook = await this.bookPersistenceService.updateBookRecord(preferredBook.id, updatedBook);
      await this.fileService.moveFile(incomingPath, join(uploadsDirectory, 'books', finalFileName));
      return persistedBook;
    }

    const book = new Book(
      randomUUID(),
      enrichedDto.title,
      enrichedDto.author,
      enrichedDto.fileName,
      enrichedDto.isFavorite ?? false,
      enrichedDto.genres,
      enrichedDto.publishedYear ? this.parseYear(enrichedDto.publishedYear) : undefined,
      enrichedDto.coverImageFileName,
      parsedSummary,
      enrichedDto.uploadedByUserId,
      enrichedDto.series,
      enrichedDto.seriesPosition,
      enrichedDto.isbn,
      enrichedDto.pageCount,
      enrichedDto.publisher,
      enrichedDto.language,
      enrichedDto.averageRating,
      enrichedDto.ratingsCount,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      contentHash,
      undefined,
      [newFormat],
    );

    const createdBook = await this.bookPersistenceService.createBookRecord(book);

    await this.fileService.moveFile(incomingPath, join(uploadsDirectory, 'books', finalFileName));

    if (existingByHash) {
      await this.duplicateRegistrationService.flagPotentialDuplicate(createdBook.id, existingByHash.id);
      this.logger.log(`Potential duplicate flagged for new book "${createdBook.title}" (${createdBook.id})`);
    }

    void this.metadataGateway
      .enrichBook(createdBook)
      .then((enriched) => this.bookPersistenceService.updateBookRecord(enriched.id, enriched))
      .catch((error: unknown) => {
        this.logger.warn(`Background metadata fetch failed for book "${book.title}": ${String(error)}`);
      });

    return createdBook;
  }

  private async deleteIncomingFiles(
    uploadsDirectory: string,
    uploadedFileName: string,
    uploadedCoverFileName?: string,
    extractedCoverFileName?: string,
  ): Promise<void> {
    const filesToDelete = [
      join(uploadsDirectory, 'incoming', basename(uploadedFileName)),
      uploadedCoverFileName ? join(uploadsDirectory, 'cover-images', basename(uploadedCoverFileName)) : null,
      extractedCoverFileName ? join(uploadsDirectory, 'cover-images', basename(extractedCoverFileName)) : null,
    ].filter((filePath): filePath is string => filePath !== null && this.fileService.fileExists(filePath));

    await Promise.all(filesToDelete.map((filePath) => this.fileService.deleteFile(filePath)));
  }

  private resolveUniqueFileName(uploadsDirectory: string, desiredFileName: string): string {
    const booksDir = join(uploadsDirectory, 'books');
    if (!this.fileService.fileExists(join(booksDir, desiredFileName))) {
      return desiredFileName;
    }

    const extensionIndex = desiredFileName.lastIndexOf('.');
    const ext = extensionIndex >= 0 ? desiredFileName.slice(extensionIndex) : '';
    const nameWithoutExt = extensionIndex >= 0 ? desiredFileName.slice(0, extensionIndex) : desiredFileName;
    let counter = 2;
    let candidate = `${nameWithoutExt} (${counter})${ext}`;
    while (this.fileService.fileExists(join(booksDir, candidate))) {
      counter++;
      candidate = `${nameWithoutExt} (${counter})${ext}`;
    }
    return candidate;
  }

  private parseYear(year: string): number | undefined {
    const yearNumber = parseInt(year);
    return Number.isNaN(yearNumber) ? undefined : yearNumber;
  }

  private async findMatchingBook(title: string, author: string, isbn?: string): Promise<Book | undefined> {
    if (isbn) {
      const byIsbn = await this.bookPersistenceService.searchBooksWithFilters({ isbn }, 10, 0);
      const match = byIsbn.data.find((book) => logicalBookMatches(book, { title, author, isbn }));
      if (match) {
        try {
          return await this.bookPersistenceService.findBookById(match.id);
        } catch {
          return undefined;
        }
      }
    }

    const byAuthorAndTitle = await this.bookPersistenceService.searchBooksByAuthorAndTitle(author, title, 10, 0);
    const byAuthorMatch = byAuthorAndTitle.data.find((book) => logicalBookMatches(book, { title, author, isbn }));
    if (byAuthorMatch) {
      try {
        return await this.bookPersistenceService.findBookById(byAuthorMatch.id);
      } catch {
        return undefined;
      }
    }

    const byTitle = await this.bookPersistenceService.searchBooksWithFilters({ query: title }, 20, 0);
    const byTitleMatch = byTitle.data.find((book) => logicalBookMatches(book, { title, author, isbn }));
    if (byTitleMatch) {
      try {
        return await this.bookPersistenceService.findBookById(byTitleMatch.id);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private throwMissingMetadata(field: string): never {
    throw new BadRequestException(`Could not determine "${field}" from the uploaded file. Please provide it manually.`);
  }
}
