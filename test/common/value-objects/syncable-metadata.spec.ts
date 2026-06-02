import { SyncableMetadataHelper } from 'src/common/value-objects/syncable-metadata';

describe('SyncableMetadataHelper', () => {
  describe('fromBook', () => {
    test('Extracts syncable fields from book', () => {
      const book = {
        title: 'Test',
        author: 'Author',
        language: 'en',
        publisher: 'Pub',
        publishedYear: 2020,
        isbn: '123',
        summary: 'Sum',
        genres: ['fiction'],
        series: 'S1',
        seriesPosition: 1,
      };

      const result = SyncableMetadataHelper.fromBook(book);

      expect(result.title).toBe('Test');
      expect(result.author).toBe('Author');
      expect(result.language).toBe('en');
      expect(result.genres).toEqual(['fiction']);
    });

    test('Handles undefined optional fields', () => {
      const result = SyncableMetadataHelper.fromBook({ title: 'T', author: 'A' });

      expect(result.title).toBe('T');
      expect(result.language).toBeUndefined();
      expect(result.genres).toBeUndefined();
    });
  });

  describe('equals', () => {
    test('Equal metadata returns true', () => {
      const a = { title: 'T', author: 'A', genres: ['b', 'a'] };
      const b = { title: 'T', author: 'A', genres: ['a', 'b'] };

      expect(
        SyncableMetadataHelper.equals(SyncableMetadataHelper.fromBook(a), SyncableMetadataHelper.fromBook(b)),
      ).toBe(true);
    });

    test('Different metadata returns false', () => {
      const a = SyncableMetadataHelper.fromBook({ title: 'A', author: 'A' });
      const b = SyncableMetadataHelper.fromBook({ title: 'B', author: 'A' });

      expect(SyncableMetadataHelper.equals(a, b)).toBe(false);
    });
  });
});
