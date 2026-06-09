import { EpubParserService } from 'src/modules/book/format/epub-parser.service';

jest.mock('epub2', () => {
  const mockEpub = {
    metadata: {},
    manifest: {},
    getImageAsync: jest.fn(),
  };
  return {
    default: {
      createAsync: jest.fn().mockResolvedValue(mockEpub),
    },
    __mockEpub: mockEpub,
  };
});

interface MockEpub {
  metadata: Record<string, unknown>;
  manifest: Record<string, { id?: string; 'media-type'?: string }>;
  getImageAsync: jest.Mock;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const epub2 = require('epub2') as { __mockEpub: MockEpub };
const mockEpub = epub2.__mockEpub;

describe('EpubParserService', () => {
  let service: EpubParserService;

  beforeEach(() => {
    service = new EpubParserService();
    mockEpub.metadata = {};
    mockEpub.manifest = {};
    mockEpub.getImageAsync = jest.fn();
  });

  test('Returns empty object when epub has no metadata', async () => {
    const result = await service.parse('/fake/path/book.epub');
    expect(result).toEqual({});
  });

  test('Extracts basic OPF metadata fields', async () => {
    mockEpub.metadata = {
      title: '  My Book  ',
      creator: 'Jane Doe',
      language: 'en',
      publisher: 'Acme Press',
      date: '2022-06-15',
      ISBN: '978-0-00-000000-0',
      description: 'A great book.',
      subject: ['Fiction', 'Adventure'],
    };

    const result = await service.parse('/fake/path/book.epub');

    expect(result.title).toBe('My Book');
    expect(result.author).toBe('Jane Doe');
    expect(result.language).toBe('en');
    expect(result.publisher).toBe('Acme Press');
    expect(result.publishedYear).toBe(2022);
    expect(result.isbn).toBe('978-0-00-000000-0');
    expect(result.summary).toBe('A great book.');
    expect(result.genres).toEqual(['Fiction', 'Adventure']);
  });

  test('Strips HTML tags from description', async () => {
    mockEpub.metadata = { description: '<p>A <strong>great</strong> book.</p>' };
    const result = await service.parse('/fake/path/book.epub');
    expect(result.summary).toBe('A great book.');
  });

  test('Caps genres at 5', async () => {
    mockEpub.metadata = {
      subject: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    };
    const result = await service.parse('/fake/path/book.epub');
    expect(result.genres).toHaveLength(5);
  });

  test('Extracts EPUB3 series metadata (belongs-to-collection)', async () => {
    mockEpub.metadata = {
      'belongs-to-collection': 'The Great Series',
      'group-position': '3',
    };
    const result = await service.parse('/fake/path/book.epub');
    expect(result.series).toBe('The Great Series');
    expect(result.seriesPosition).toBe(3);
  });

  test('Falls back to calibre series metadata', async () => {
    mockEpub.metadata = {
      'calibre:series': 'Calibre Series',
      'calibre:series_index': '1.5',
    };
    const result = await service.parse('/fake/path/book.epub');
    expect(result.series).toBe('Calibre Series');
    expect(result.seriesPosition).toBe(1.5);
  });

  test('Extracts cover image using metadata.cover ID', async () => {
    const fakeBuffer = Buffer.from('fake-image-data');
    mockEpub.metadata = { cover: 'cover-img-id' };
    mockEpub.getImageAsync = jest.fn().mockResolvedValue([fakeBuffer, 'image/jpeg']);

    const result = await service.parse('/fake/path/book.epub');

    expect(mockEpub.getImageAsync).toHaveBeenCalledWith('cover-img-id');
    expect(result.coverImageBuffer).toEqual(fakeBuffer);
    expect(result.coverImageMimeType).toBe('image/jpeg');
  });

  test('Falls back to manifest cover when metadata.cover is absent', async () => {
    const fakeBuffer = Buffer.from('cover-fallback');
    mockEpub.metadata = {};
    mockEpub.manifest = {
      'cover-image': { id: 'cover-image', 'media-type': 'image/jpeg' },
    };
    mockEpub.getImageAsync = jest.fn().mockResolvedValue([fakeBuffer, 'image/jpeg']);

    const result = await service.parse('/fake/path/book.epub');

    expect(mockEpub.getImageAsync).toHaveBeenCalledWith('cover-image');
    expect(result.coverImageBuffer).toEqual(fakeBuffer);
  });

  test('Returns no cover when getImageAsync throws', async () => {
    mockEpub.metadata = { cover: 'cover-id' };
    mockEpub.getImageAsync = jest.fn().mockRejectedValue(new Error('not found'));

    const result = await service.parse('/fake/path/book.epub');
    expect(result.coverImageBuffer).toBeUndefined();
  });

  test('Handles invalid date gracefully', async () => {
    mockEpub.metadata = { date: 'not-a-date' };
    const result = await service.parse('/fake/path/book.epub');
    expect(result.publishedYear).toBeUndefined();
  });
});
