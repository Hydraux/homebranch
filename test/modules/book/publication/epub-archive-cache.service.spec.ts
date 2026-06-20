import { EpubArchiveCacheService } from 'src/modules/book/publication/epub-archive-cache.service';

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({ readAsText: jest.fn() }));
});

describe('EpubArchiveCacheService', () => {
  const storage = {
    getFileStats: jest.fn(),
    getFileBuffer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses a cached archive when size and mtime are unchanged', async () => {
    storage.getFileStats.mockResolvedValue({ size: 4, mtimeMs: 123 });
    storage.getFileBuffer.mockResolvedValue({ key: 'books/book.epub', buffer: Buffer.from('book') });
    const service = new EpubArchiveCacheService(storage as never);

    const first = await service.getArchive('books/book.epub');
    const second = await service.getArchive('books/book.epub');

    expect(second).toBe(first);
    expect(storage.getFileBuffer).toHaveBeenCalledTimes(1);
  });
});
