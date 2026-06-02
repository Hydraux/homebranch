import { Controller, Get, Param, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { IsOptional } from 'class-validator';
import { BookFormatType } from 'src/modules/book/format/book-format-type.enum';
import { BookPublicationService } from 'src/modules/book/publication/book-publication.service';
import { buildExternalBaseUrl } from 'src/common/utils/external-url';
import { BookService } from 'src/modules/book/catalog/book.service';
import { basename, join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { getBookFormatExtension, getBookFormatMediaType } from 'src/modules/book/format/book-format';

class BookFormatQueryDto {
  @IsOptional()
  format?: BookFormatType;

  @IsOptional()
  inline?: string;
}

@Controller('books')
export class BookPublicationController {
  constructor(
    private readonly bookPublicationService: BookPublicationService,
    private readonly bookService: BookService,
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
    response.setHeader('Content-Type', 'application/webpub+json');
    return this.bookPublicationService.getManifest(id, baseUrl, query.format);
  }

  @Get(':id/content/*')
  @UseGuards(JwtAuthGuard)
  async getBookContent(
    @Param('id') id: string,
    @Query() query: BookFormatQueryDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    const rawPath = req.url.split(`/content/`)[1]?.split('?')[0] ?? '';
    const entryPath = rawPath.split('/').map(decodeURIComponent).join('/');
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
    const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';
    const safeFileName = basename(fileName);
    const filePath = join(uploadsDirectory, 'books', safeFileName);

    if (!existsSync(filePath)) {
      response
        .status(404)
        .json({ success: false, error: 'BOOK_FILE_NOT_FOUND', message: 'Book file not found on server' });
      return;
    }

    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream, {
      type: getBookFormatMediaType(format),
      disposition: `${query.inline === 'true' ? 'inline' : 'attachment'}; filename="${sanitizedTitle}${getBookFormatExtension(
        format,
      )}"`,
    });
  }
}
