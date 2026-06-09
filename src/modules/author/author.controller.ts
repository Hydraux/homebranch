import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaginatedQuery } from 'src/common/core/paginated-query';
import { UpdateAuthorDto } from 'src/modules/author/dto/update-author.dto';
import { buildExternalBaseUrl } from 'src/common/utils/external-url';
import { AuthorService } from 'src/modules/author/author.service';

@Controller('authors')
@UseGuards(JwtAuthGuard)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

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
        destination: (
          _req: Express.Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          cb(null, `${process.env.UPLOADS_DIRECTORY || join(process.cwd(), 'uploads')}/author-images`);
        },
        filename: (
          _req: Express.Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          cb(null, `${randomUUID()}.jpg`);
        },
      }),
    }),
  )
  uploadProfilePicture(
    @Param('name') name: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('A file must be provided');
    }
    const profilePictureUrl = `${buildExternalBaseUrl(req)}/uploads/author-images/${file.filename}`;
    return this.authorService.uploadProfilePicture(name, profilePictureUrl);
  }
}
