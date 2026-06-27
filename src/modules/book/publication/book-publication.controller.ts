import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { IsOptional } from 'class-validator';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPublicationService } from 'src/modules/book/publication/book-publication.service';
import { buildExternalBaseUrl } from 'src/common/utils/external-url';
import { BookService } from 'src/modules/book/catalog/book.service';
import { basename } from 'path';
import { getBookFormatExtension, getBookFormatMediaType } from 'src/modules/book/format/book-format';
import { IStorageService, STORAGE_SERVICE_TOKEN } from 'src/modules/storage/storage.interface';
import { StorageStreamResult } from 'src/modules/storage/storage.types';

class BookFormatQueryDto {
  @IsOptional()
  format?: BookFormatType;

  @IsOptional()
  inline?: string;
}

@Controller('books')
export class BookPublicationController {
  private readonly logger = new Logger(BookPublicationController.name);

  constructor(
    private readonly bookPublicationService: BookPublicationService,
    private readonly bookService: BookService,
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storage: IStorageService,
  ) {}

  @Get(':id/manifest')
  @UseGuards(JwtAuthGuard)
  async getBookManifest(
    @Param('id') id: string,
    @Query() query: BookFormatQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<object | void> {
    const baseUrl = buildExternalBaseUrl(req, { includeForwardedPrefix: true });
    const result = await this.bookPublicationService.getManifest(id, baseUrl, query.format);
    response.setHeader('Content-Type', 'application/webpub+json');
    return result;
  }

  @Get(':id/content/*path')
  @Get(':id/content/:path(*)')
  @UseGuards(JwtAuthGuard)
  async getBookContent(
    @Param('id') id: string,
    @Param('path') path: string | undefined,
    @Query() query: BookFormatQueryDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    const rawPath = path ?? req.url.split(`/content/`)[1]?.split('?')[0] ?? '';
    const entryPath = rawPath.split('/').map(decodeURIComponent).join('/');
    this.logger.log(`Serving content request for book "${id}" and path "${entryPath}"`);
    const { data, mediaType } = await this.bookPublicationService.getContent(id, entryPath, query.format);
    response.setHeader('Content-Type', mediaType);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.send(data);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadBook(
    @Param('id') id: string,
    @Query() query: BookFormatQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | void> {
    const { book, format, fileName } = await this.bookService.getDownload(id, query.format);
    const sanitizedTitle = book.title.replace(/[^\w\s-]/g, '').trim() || 'book';
    const safeFileName = basename(fileName);
    let storageStreamResult: StorageStreamResult;
    try {
      storageStreamResult = await this.storage.getFileStream(`books/${safeFileName}`);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
      response
        .status(404)
        .json({ success: false, error: 'BOOK_FILE_NOT_FOUND', message: 'Book file not found on server' });
      return;
    }

    return new StreamableFile(storageStreamResult.stream, {
      type: getBookFormatMediaType(format),
      disposition: `${query.inline === 'true' ? 'inline' : 'attachment'}; filename="${sanitizedTitle}${getBookFormatExtension(
        format,
      )}"`,
    });
  }
}
