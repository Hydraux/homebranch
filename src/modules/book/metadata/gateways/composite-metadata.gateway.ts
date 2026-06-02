import { Injectable } from '@nestjs/common';
import { GoogleBooksGateway } from 'src/common/gateways/google-books.gateway';
import { OpenLibraryGateway } from 'src/common/gateways/open-library.gateway';
import { Book } from 'src/modules/book/book.model';
import { AuthorEntity } from 'src/modules/author/author.entity';

@Injectable()
export class CompositeMetadataGateway {
  constructor(
    private readonly openLibraryGateway: OpenLibraryGateway,
    private readonly googleBooksGateway: GoogleBooksGateway,
  ) {}

  async enrichBook(book: Book): Promise<Book> {
    book = await this.openLibraryGateway.enrichBook(book);
    book = await this.googleBooksGateway.enrichBook(book);
    return book;
  }

  async enrichAuthor(author: AuthorEntity): Promise<AuthorEntity> {
    return this.openLibraryGateway.enrichAuthor(author);
  }
}
