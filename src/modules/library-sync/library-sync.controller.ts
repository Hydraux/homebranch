import { Body, Controller, Get, Header, Param, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.decorator';
import { Observable } from 'rxjs';
import { LibraryEventsService } from 'src/modules/library-sync/library-events.service';
import { LibrarySyncService } from 'src/modules/library-sync/library-sync.service';

class OrphanedBooksDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  knownUserIds: string[] = [];

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}

@Controller('library')
export class LibrarySyncController {
  constructor(
    private readonly librarySyncService: LibrarySyncService,
    private readonly libraryEventsService: LibraryEventsService,
  ) {}

  @Sse('events')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  streamEvents(): Observable<MessageEvent> {
    return this.libraryEventsService.getStream();
  }

  @Post('scan')
  @UseGuards(JwtAuthGuard)
  async triggerScan() {
    return this.librarySyncService.triggerScan();
  }

  @Post('books/:id/sync')
  @UseGuards(JwtAuthGuard)
  async triggerBookSync(@Param('id') id: string) {
    return this.librarySyncService.triggerBookMetadataSync(id);
  }

  @Get('unowned-books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getUnownedBooks(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.librarySyncService.getUnownedBooks(limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  @Post('orphaned-books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getOrphanedBooks(@Body() dto: OrphanedBooksDto) {
    return this.librarySyncService.getOrphanedBooks(dto.knownUserIds ?? [], dto.limit ?? 20, dto.offset ?? 0);
  }
}
