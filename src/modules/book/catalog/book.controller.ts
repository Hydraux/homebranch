import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateBookRequest } from 'src/modules/book/dto/create-book-request';
import { UpdateBookRequest } from 'src/modules/book/dto/update-book-request';
import { GetBooksRequest } from 'src/modules/book/dto/get-books-request';
import { BookCreationService } from 'src/modules/book/catalog/book-creation.service';
import { BookMutationService } from 'src/modules/book/catalog/book-mutation.service';
import { BookService } from 'src/modules/book/catalog/book.service';
import { UpdateBookDto } from 'src/modules/book/dto/update-book.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { IsOptional, IsUUID } from 'class-validator';

class AssignOwnerDto {
  @IsUUID()
  @IsOptional()
  userId: string | null;
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
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly bookCreationService: BookCreationService,
    private readonly bookMutationService: BookMutationService,
  ) {}
  @Get()
  @UseGuards(JwtAuthGuard)
  getBooks(@Query() paginationDto: GetBooksRequest, @CurrentUser() currentUser: Express.User) {
    return this.bookService.getBooks({ ...paginationDto, viewerUserId: currentUser.id });
  }

  @Get('favorite')
  @UseGuards(JwtAuthGuard)
  getFavoriteBooks(@Query() paginationDto: GetBooksRequest, @CurrentUser() currentUser: Express.User) {
    return this.bookService.getFavoriteBooks({ ...paginationDto, userId: currentUser.id });
  }

  @Put(':id/favorite')
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@Param('id') id: string, @CurrentUser() currentUser: Express.User) {
    return this.bookService.toggleFavorite(currentUser.id, id);
  }

  @Get(`:id`)
  @UseGuards(JwtAuthGuard)
  getBookById(@Param('id') id: string, @CurrentUser() currentUser: Express.User) {
    return this.bookService.getBookById(id, currentUser.id);
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
    return this.bookCreationService.createBook({
      ...createBookRequest,
      fileName: files.file!.at(0)!.filename,
      originalFileName: files.file!.at(0)!.originalname,
      coverImageFileName: files.coverImage?.at(0)?.filename,
      uploadedByUserId: currentUser.id,
    });
  }

  @Delete(`:id`)
  @UseGuards(JwtAuthGuard)
  deleteBook(@CurrentUser() currentUser: Express.User, @Param('id') id: string) {
    return this.bookService.deleteBook(id, currentUser.id, currentUser.roles?.includes('ADMIN') ?? false);
  }

  @Patch('assign-owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  bulkAssignOwner(@Body() dto: BulkAssignOwnerDto, @CurrentUser() currentUser: Express.User) {
    return this.bookService.bulkAssignBookOwner(dto.bookIds, dto.userId, currentUser.roles?.includes('ADMIN') ?? false);
  }

  @Patch(`:id/owner`)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  assignOwner(@Param('id') id: string, @Body() dto: AssignOwnerDto, @CurrentUser() currentUser: Express.User) {
    return this.bookService.assignBookOwner(id, dto.userId, currentUser.roles?.includes('ADMIN') ?? false);
  }

  @Put(`:id`)
  @UseGuards(JwtAuthGuard)
  updateBook(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    const updateBookRequest: UpdateBookRequest = {
      id,
      ...updateBookDto,
    };
    return this.bookMutationService.updateBook(updateBookRequest);
  }

  @Post(':id/link')
  @UseGuards(JwtAuthGuard)
  linkBooks(@Param('id') id: string, @Body() dto: LinkBooksDto, @CurrentUser() currentUser: Express.User) {
    return this.bookMutationService.linkBooks({
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
    return this.bookMutationService.unlinkBookFormat({
      bookId: id,
      formatId,
      requestingUserId: currentUser.id,
      requestingUserRole: currentUser.roles?.includes('ADMIN') ? 'ADMIN' : 'USER',
    });
  }

  @Post(':id/fetch-metadata')
  @UseGuards(JwtAuthGuard)
  fetchBookMetadata(@Param('id') id: string) {
    return this.bookService.fetchBookMetadata(id);
  }

  @Post(':id/fetch-summary')
  @UseGuards(JwtAuthGuard)
  fetchBookSummary(@Param('id') id: string) {
    return this.bookService.fetchBookSummary(id);
  }
}
