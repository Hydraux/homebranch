import { metadataMatches } from 'src/modules/book/deduplication/book-deduplication.service';
import { Book } from 'src/modules/book/book.model';

function makeBook(overrides: Partial<Book>): Book {
  return new Book(
    overrides.id ?? 'book-1',
    overrides.title ?? 'Default Title',
    overrides.author ?? 'Default Author',
    overrides.fileName ?? 'file.epub',
    false,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    overrides.isbn,
  );
}

describe('metadataMatches', () => {
  describe('ISBN comparison (both books have ISBN)', () => {
    test('Returns true when ISBNs are identical', () => {
      const a = makeBook({ isbn: '978-3-16-148410-0' });
      expect(
        metadataMatches(a, { title: 'Different Title', author: 'Different Author', isbn: '978-3-16-148410-0' }),
      ).toBe(true);
    });

    test('Returns false when ISBNs differ', () => {
      const a = makeBook({ isbn: '978-3-16-148410-0' });
      expect(metadataMatches(a, { title: 'Same Title', author: 'Same Author', isbn: '978-0-00-000000-1' })).toBe(false);
    });

    test('Ignores title and author when ISBNs match', () => {
      const a = makeBook({ isbn: '1234567890', title: 'Title A', author: 'Author A' });
      expect(metadataMatches(a, { title: 'Completely Different', author: 'Nobody', isbn: '1234567890' })).toBe(true);
    });

    test('Normalizes ISBN casing', () => {
      const a = makeBook({ isbn: 'ISBN-ABC' });
      expect(metadataMatches(a, { title: 'T', author: 'A', isbn: 'isbn-abc' })).toBe(true);
    });

    test('Trims whitespace from ISBNs', () => {
      const a = makeBook({ isbn: '  1234567890  ' });
      expect(metadataMatches(a, { title: 'T', author: 'A', isbn: '1234567890' })).toBe(true);
    });
  });

  describe('Title + author fallback (at least one book lacks ISBN)', () => {
    test('Returns true when title and author match exactly', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert' });
      expect(metadataMatches(a, { title: 'Dune', author: 'Frank Herbert' })).toBe(true);
    });

    test('Returns false when only title matches', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert' });
      expect(metadataMatches(a, { title: 'Dune', author: 'Someone Else' })).toBe(false);
    });

    test('Returns false when only author matches', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert' });
      expect(metadataMatches(a, { title: 'Dune Messiah', author: 'Frank Herbert' })).toBe(false);
    });

    test('Normalizes casing on title and author', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert' });
      expect(metadataMatches(a, { title: 'DUNE', author: 'FRANK HERBERT' })).toBe(true);
    });

    test('Normalizes extra whitespace in title and author', () => {
      const a = makeBook({ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' });
      expect(metadataMatches(a, { title: '  The  Great  Gatsby  ', author: '  F. Scott  Fitzgerald  ' })).toBe(true);
    });

    test('Falls back to title+author when only one book has ISBN', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert', isbn: '1234567890' });
      // b has no ISBN — must fall back to title+author
      expect(metadataMatches(a, { title: 'Dune', author: 'Frank Herbert' })).toBe(true);
    });

    test('Falls back to title+author when a has no ISBN', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert' });
      // b has ISBN but a doesn't — fall back to title+author
      expect(metadataMatches(a, { title: 'Dune', author: 'Frank Herbert', isbn: '1234567890' })).toBe(true);
    });

    test('Returns false when both have different ISBNs but are passed without isbn in b', () => {
      const a = makeBook({ title: 'Dune', author: 'Frank Herbert', isbn: '1234567890' });
      // b has no ISBN, title matches but not isbn comparison
      expect(metadataMatches(a, { title: 'Dune', author: 'Different Author' })).toBe(false);
    });
  });
});
