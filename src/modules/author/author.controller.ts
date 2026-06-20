import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaginatedQuery } from 'src/common/core/paginated-query';
import { UpdateAuthorDto } from 'src/modules/author/dto/update-author.dto';
import { AuthorService } from 'src/modules/author/author.service';
import { IStorageService, STORAGE_SERVICE_TOKEN } from '../storage/storage.interface';
import { tmpdir } from 'os';

@Controller('authors')
@UseGuards(JwtAuthGuard)
export class AuthorController {
  constructor(
    private readonly authorService: AuthorService,
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storage: IStorageService,
  ) {}

  @Get()
  getAuthors(@Query() paginatedQuery: PaginatedQuery & { userId?: string }) {
    return this.authorService.getAuthors(
      paginatedQuery.query,
      paginatedQuery.limit,
      paginatedQuery.offset,
      paginatedQuery.userId,
    );
  }

  @Get(':name')
  getAuthor(@Param('name') name: string) {
    return this.authorService.getAuthor(name);
  }

  @Get(':name/books')
  getBooksByAuthor(@Param('name') name: string, @Query() paginatedQuery: PaginatedQuery & { userId?: string }) {
    return this.authorService.getBooksByAuthor(
      name,
      paginatedQuery.query,
      paginatedQuery.limit,
      paginatedQuery.offset,
      paginatedQuery.userId,
    );
  }

  @Patch(':name')
  updateAuthor(@Param('name') name: string, @Body() updateAuthorDto: UpdateAuthorDto) {
    return this.authorService.updateAuthor(name, updateAuthorDto.biography);
  }

  @Post(':name/profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(tmpdir(), 'uploads'));
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}-${file.originalname}`);
        },
      }),
    }),
  )
  async uploadProfilePicture(@Param('name') name: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('A file must be provided');
    }
    const fileName = `${randomUUID()}.jpg`;
    const key = `author-images/${fileName}`;
    const { url } = await this.storage.uploadFileFromPath(file.path, {
      key,
      mimeType: 'image/jpeg',
    });
    return this.authorService.uploadProfilePicture(name, url);
  }
}
