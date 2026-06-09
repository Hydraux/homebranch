import { AuthorEntity } from 'src/modules/author/author.entity';

export const mockAuthorEntity: AuthorEntity = {
  id: 'author-uuid-1',
  name: 'Jane Austen',
  biography: 'Jane Austen was an English novelist known for her wit and social commentary.',
  profilePictureUrl: 'https://covers.openlibrary.org/a/olid/OL21594A-L.jpg',
};

export const mockAuthorEntityWithoutEnrichment: AuthorEntity = {
  id: 'author-uuid-2',
  name: 'Charles Dickens',
  biography: null,
  profilePictureUrl: null,
};
