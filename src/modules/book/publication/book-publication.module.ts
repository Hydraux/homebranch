import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { BookPublicationService } from 'src/modules/book/publication/book-publication.service';
import { EpubManifestService } from 'src/modules/book/publication/epub-manifest.service';
import { EpubContentService } from 'src/modules/book/publication/epub-content.service';
import { BookPublicationController } from 'src/modules/book/publication/book-publication.controller';

@Module({
  imports: [AuthModule, BookCoreModule],
  providers: [BookPublicationService, EpubManifestService, EpubContentService],
  controllers: [BookPublicationController],
})
export class BookPublicationModule {}
