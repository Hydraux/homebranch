import { FileNameGenerator } from 'src/common/utils/filename-generator';

describe('FileNameGenerator', () => {
  describe('generate', () => {
    test('Creates basic author-title format', () => {
      expect(FileNameGenerator.generate('Jane Austen', 'Pride and Prejudice')).toBe(
        'Jane Austen - Pride and Prejudice.epub',
      );
    });

    test('Sanitizes slashes', () => {
      expect(FileNameGenerator.generate('Author/Name', 'Title\\Here')).toBe('Author-Name - Title-Here.epub');
    });

    test('Sanitizes special characters', () => {
      expect(FileNameGenerator.generate('Author', 'Title: A "Story"')).toBe('Author - Title_ A _Story_.epub');
    });

    test('Trims whitespace', () => {
      expect(FileNameGenerator.generate('  Author  ', '  Title  ')).toBe('Author - Title.epub');
    });

    test('Truncates long filenames', () => {
      const longTitle = 'A'.repeat(300);
      const result = FileNameGenerator.generate('Author', longTitle);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result.endsWith('.epub')).toBe(true);
    });
  });

  describe('isLegacyUuidFileName', () => {
    test('Detects UUID filenames', () => {
      expect(FileNameGenerator.isLegacyUuidFileName('550e8400-e29b-41d4-a716-446655440000.epub')).toBe(true);
    });

    test('Rejects non-UUID filenames', () => {
      expect(FileNameGenerator.isLegacyUuidFileName('Jane Austen - Pride and Prejudice.epub')).toBe(false);
    });

    test('Rejects partial UUID', () => {
      expect(FileNameGenerator.isLegacyUuidFileName('550e8400-e29b-41d4.epub')).toBe(false);
    });
  });

  describe('disambiguate', () => {
    test('Returns original if no conflict', () => {
      const existing = new Set(['other.epub']);
      expect(FileNameGenerator.disambiguate('Book.epub', existing)).toBe('Book.epub');
    });

    test('Adds (2) suffix on first conflict', () => {
      const existing = new Set(['Book.epub']);
      expect(FileNameGenerator.disambiguate('Book.epub', existing)).toBe('Book (2).epub');
    });

    test('Increments suffix until unique', () => {
      const existing = new Set(['Book.epub', 'Book (2).epub', 'Book (3).epub']);
      expect(FileNameGenerator.disambiguate('Book.epub', existing)).toBe('Book (4).epub');
    });
  });
});
