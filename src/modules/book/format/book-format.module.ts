import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from 'src/modules/book/book.entity';
import { BookFormatEntity } from 'src/modules/book/format/book-format.entity';
import { BookFormatProcessingService } from 'src/modules/book/format/book-format-processing.service';
import { EpubParserService } from 'src/modules/book/format/epub-parser.service';
import { EpubMetadataWriterService } from 'src/modules/book/format/epub-metadata-writer.service';
import { PdfParserService } from 'src/modules/book/format/pdf-parser.service';
import { ContentHashService } from 'src/modules/book/format/content-hash.service';
import { FileService } from 'src/modules/book/format/file.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookEntity, BookFormatEntity])],
  providers: [
    EpubParserService,
    PdfParserService,
    EpubMetadataWriterService,
    BookFormatProcessingService,
    ContentHashService,
    FileService,
  ],
  exports: [BookFormatProcessingService, ContentHashService, FileService],
})
export class BookFormatModule {}
