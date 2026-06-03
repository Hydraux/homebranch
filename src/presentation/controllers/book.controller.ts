import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateBookRequest } from 'src/application/contracts/book/create-book-request';
import { UpdateBookRequest } from 'src/application/contracts/book/update-book-request';
import { GetBooksRequest } from 'src/application/contracts/book/get-books-request';
import { CreateBookUseCase } from 'src/application/usecases/book/create-book.usecase';
import { DeleteBookUseCase } from 'src/application/usecases/book/delete-book.usecase';
import { GetBooksUseCase } from 'src/application/usecases/book/get-books.usecase';
import { UpdateBookUseCase } from 'src/application/usecases/book/update-book.usecase';
import { AssignBookOwnerUseCase } from 'src/application/usecases/book/assign-book-owner.usecase';
import { UpdateBookDto } from '../dtos/update-book.dto';
import { GetBookByIdUseCase } from 'src/application/usecases/book/get-book-by-id.usecase';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { basename, extname, join } from 'path';
import { DeleteBookRequest } from 'src/application/contracts/book/delete-book-request';
import { GetFavoriteBooksUseCase } from 'src/application/usecases/book/get-favorite-books-use-case.service';
import { ToggleBookFavoriteUseCase } from 'src/application/usecases/book/toggle-book-favorite-use-case.service';
import { JwtAuthGuard } from 'src/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'src/presentation/guards/roles.guard';
import { Roles } from 'src/presentation/guards/roles.decorator';
import { MapResultInterceptor } from '../interceptors/map_result.interceptor';
import { DownloadBookUseCase } from 'src/application/usecases/book/download-book.usecase';
import { GetBookManifestUseCase } from 'src/application/usecases/book/get-book-manifest.usecase';
import { GetBookContentUseCase } from 'src/application/usecases/book/get-book-content.usecase';
import { createReadStream, existsSync } from 'fs';
import { Response } from 'express';
import { FetchBookMetadataUseCase } from 'src/application/usecases/book/fetch-book-metadata-use-case.service';
import { FetchBookSummaryUseCase } from 'src/application/usecases/book/fetch-book-summary.usecase';
import { CurrentUser } from 'src/presentation/decorators/current-user.decorator';
import { IsOptional, IsUUID } from 'class-validator';
import { Result } from 'src/core/result';
import { BookFormatType } from 'src/domain/entities/book-format.entity';
import { getBookFormatExtension, getBookFormatMediaType } from 'src/domain/services/book-format';
import { LinkBooksUseCase } from 'src/application/usecases/book/link-books.usecase';
import { UnlinkBookFormatUseCase } from 'src/application/usecases/book/unlink-book-format.usecase';
import { buildExternalBaseUrl } from 'src/presentation/utils/external-url';

class AssignOwnerDto {
  @IsUUID()
  @IsOptional()
  userId: string | null;
}

class BookFormatQueryDto {
  @IsOptional()
  format?: BookFormatType;

  @IsOptional()
  inline?: string;
}

class BulkAssignOwnerDto {
  @IsUUID(undefined, { each: true })
  bookIds: string[];

  @IsUUID()
  @IsOptional()
  userId: string | null;
}

class LinkBooksDto {
  @IsUUID()
  sourceBookId: string;
}

@Controller('books')
@UseInterceptors(MapResultInterceptor)
export class BookController {
  constructor(
    private readonly getBooksUseCase: GetBooksUseCase,
    private readonly getBookByIdUseCase: GetBookByIdUseCase,
    private readonly getFavoriteBooksUseCase: GetFavoriteBooksUseCase,
    private readonly createBookUseCase: CreateBookUseCase,
    private readonly deleteBookUseCase: DeleteBookUseCase,
    private readonly updateBookUseCase: UpdateBookUseCase,
    private readonly downloadBookUseCase: DownloadBookUseCase,
    private readonly getBookManifestUseCase: GetBookManifestUseCase,
    private readonly getBookContentUseCase: GetBookContentUseCase,
    private readonly fetchBookMetadataUseCase: FetchBookMetadataUseCase,
    private readonly fetchBookSummaryUseCase: FetchBookSummaryUseCase,
    private readonly linkBooksUseCase: LinkBooksUseCase,
    private readonly unlinkBookFormatUseCase: UnlinkBookFormatUseCase,
    private readonly assignBookOwnerUseCase: AssignBookOwnerUseCase,
    private readonly toggleBookFavoriteUseCase: ToggleBookFavoriteUseCase,
  ) {}

  private readonly logger = new Logger('BookController');
  @Get()
  @UseGuards(JwtAuthGuard)
  getBooks(@Query() paginationDto: GetBooksRequest, @CurrentUser() currentUser: Express.User) {
    this.logger.log(`Getting books with title ${paginationDto.query}`);
    return this.getBooksUseCase.execute({ ...paginationDto, viewerUserId: currentUser.id });
  }

  @Get('favorite')
  @UseGuards(JwtAuthGuard)
  getFavoriteBooks(@Query() paginationDto: GetBooksRequest, @CurrentUser() currentUser: Express.User) {
    return this.getFavoriteBooksUseCase.execute({ ...paginationDto, userId: currentUser.id });
  }

  @Put(':id/favorite')
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@Param('id') id: string, @CurrentUser() currentUser: Express.User) {
    return this.toggleBookFavoriteUseCase.execute(currentUser.id, id);
  }

  @Get(`:id`)
  @UseGuards(JwtAuthGuard)
  getBookById(@Param('id') id: string, @CurrentUser() currentUser: Express.User) {
    return this.getBookByIdUseCase.execute({ id, viewerUserId: currentUser.id });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (
            _req: Express.Request,
            file: Express.Multer.File,
            cb: (error: Error | null, destination: string) => void,
          ) => {
            const uploadsDir = process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads');
            switch (file.fieldname) {
              case 'file':
                // Save to staging area so the file watcher doesn't pick it up mid-upload
                cb(null, `${uploadsDir}/incoming`);
                break;
              case 'coverImage':
                cb(null, `${uploadsDir}/cover-images`);
                break;
              default:
                cb(new Error('Invalid field name'), uploadsDir);
                break;
            }
          },
          filename: (
            _req: Express.Request,
            _file: Express.Multer.File,
            cb: (error: Error | null, filename: string) => void,
          ) => {
            const fileName = randomUUID();
            if (_file.fieldname === 'file') {
              const extension = extname(_file.originalname).toLowerCase();
              cb(null, `${fileName}${extension}`);
              return;
            } else if (_file.fieldname === 'coverImage') {
              cb(null, `${fileName}.jpg`);
              return;
            }
            cb(null, fileName);
          },
        }),
      },
    ),
  )
  async createBook(
    @CurrentUser() currentUser: Express.User,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @Body()
    createBookRequest: CreateBookRequest,
  ) {
    const bookRequest: CreateBookRequest = {
      ...createBookRequest,
      fileName: files.file!.at(0)!.filename,
      originalFileName: files.file!.at(0)!.originalname,
      coverImageFileName: files.coverImage?.at(0)?.filename,
      uploadedByUserId: currentUser.id,
    };

    const result = await this.createBookUseCase.execute(bookRequest);
    if (!result.isSuccess()) return result;

    const { book, skipped } = result.value;
    if (skipped) {
      return Result.ok({ skipped: true, existingBook: book });
    }
    return Result.ok(book);
  }

  @Delete(`:id`)
  @UseGuards(JwtAuthGuard)
  deleteBook(@CurrentUser() currentUser: Express.User, @Param('id') id: string) {
    const deleteBookRequest: DeleteBookRequest = {
      id,
      requestingUserId: currentUser.id,
      requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
    };
    return this.deleteBookUseCase.execute(deleteBookRequest);
  }

  @Patch('assign-owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async bulkAssignOwner(@Body() dto: BulkAssignOwnerDto, @CurrentUser() currentUser: Express.User) {
    const results = await Promise.allSettled(
      dto.bookIds.map((bookId) =>
        this.assignBookOwnerUseCase.execute({
          id: bookId,
          ownerId: dto.userId,
          requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
        }),
      ),
    );
    const assigned = results.filter((r) => r.status === 'fulfilled' && r.value.isSuccess()).length;
    const failed = results.length - assigned;
    return Result.ok({ assigned, failed, total: results.length });
  }

  @Patch(`:id/owner`)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  assignOwner(@Param('id') id: string, @Body() dto: AssignOwnerDto, @CurrentUser() currentUser: Express.User) {
    return this.assignBookOwnerUseCase.execute({
      id,
      ownerId: dto.userId,
      requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
    });
  }

  @Put(`:id`)
  @UseGuards(JwtAuthGuard)
  updateBook(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    const updateBookRequest: UpdateBookRequest = {
      id,
      ...updateBookDto,
    };
    return this.updateBookUseCase.execute(updateBookRequest);
  }

  @Post(':id/link')
  @UseGuards(JwtAuthGuard)
  linkBooks(@Param('id') id: string, @Body() dto: LinkBooksDto, @CurrentUser() currentUser: Express.User) {
    return this.linkBooksUseCase.execute({
      targetBookId: id,
      sourceBookId: dto.sourceBookId,
      requestingUserId: currentUser.id,
      requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
    });
  }

  @Delete(':id/formats/:formatId')
  @UseGuards(JwtAuthGuard)
  unlinkBookFormat(
    @Param('id') id: string,
    @Param('formatId') formatId: string,
    @CurrentUser() currentUser: Express.User,
  ) {
    return this.unlinkBookFormatUseCase.execute({
      bookId: id,
      formatId,
      requestingUserId: currentUser.id,
      requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
    });
  }

  @Post(':id/fetch-metadata')
  @UseGuards(JwtAuthGuard)
  fetchBookMetadata(@Param('id') id: string) {
    return this.fetchBookMetadataUseCase.execute({ id });
  }

  @Post(':id/fetch-summary')
  @UseGuards(JwtAuthGuard)
  fetchBookSummary(@Param('id') id: string) {
    return this.fetchBookSummaryUseCase.execute({ id });
  }

  @Get(':id/manifest')
  @UseGuards(JwtAuthGuard)
  async getBookManifest(
    @Param('id') id: string,
    @Query() query: BookFormatQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<object | void> {
    const baseUrl = buildExternalBaseUrl(req, { includeForwardedPrefix: true });
    const result = await this.getBookManifestUseCase.execute({ id, baseUrl, format: query.format });

    if (result.isFailure()) {
      response.status(404).json({ success: false, error: result.failure.code, message: result.failure.message });
      return;
    }

    response.setHeader('Content-Type', 'application/webpub+json');
    return result.value;
  }

  @Get(':id/content/*entryPath')
  @UseGuards(JwtAuthGuard)
  async getBookContent(
    @Param('id') id: string,
    @Query() query: BookFormatQueryDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    // Extract the entry path from the URL, after /content/
    const rawPath = req.url.split(`/content/`)[1]?.split('?')[0] ?? '';
    const entryPath = rawPath.split('/').map(decodeURIComponent).join('/');


    const result = await this.getBookContentUseCase.execute({ id, entryPath, format: query.format });

    if (result.isFailure()) {
      response.status(404).json({ success: false, error: result.failure.code, message: result.failure.message });
      return;
    }

    const { data, mediaType } = result.value!;
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
    const result = await this.downloadBookUseCase.execute({ id, format: query.format });

    if (result.isFailure()) {
      response.status(404).json({ success: false, error: result.failure.code, message: result.failure.message });
      return;
    }

    const { book, format, fileName } = result.value!;
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
    fileStream.on('error', (streamError) => {
      this.logger.error(`Error streaming book file: ${streamError.message}`);
      fileStream.destroy();
    });

    return new StreamableFile(fileStream, {
      type: getBookFormatMediaType(format),
      disposition: `${query.inline === 'true' ? 'inline' : 'attachment'}; filename="${sanitizedTitle}${getBookFormatExtension(
        format,
      )}"`,
    });
  }
}
