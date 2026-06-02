import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PaginatedQuery } from 'src/common/core/paginated-query';
import { ResolveDuplicateDto } from 'src/modules/book/dto/resolve-duplicate.dto';
import { BookDuplicateService } from 'src/modules/book/deduplication/book-duplicate.service';

@Controller('books/duplicates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BookDuplicateController {
  constructor(private readonly bookDuplicateService: BookDuplicateService) {}

  @Get()
  listDuplicates(@Query() query: PaginatedQuery) {
    return this.bookDuplicateService.listDuplicates(query.limit, query.offset);
  }

  @Post('scan')
  @HttpCode(202)
  triggerScan() {
    return this.bookDuplicateService.triggerScan();
  }

  @Post(':id/resolve')
  resolveDuplicate(
    @Param('id') id: string,
    @Body() dto: ResolveDuplicateDto,
    @CurrentUser() currentUser: Express.User,
  ) {
    return this.bookDuplicateService.resolveDuplicate(id, dto.action, currentUser.id);
  }
}
