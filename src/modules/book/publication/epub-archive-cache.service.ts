import { Inject, Injectable } from '@nestjs/common';
import * as AdmZip from 'adm-zip';
import { IStorageService, STORAGE_SERVICE_TOKEN } from 'src/modules/storage/storage.interface';

type AdmZipArchive = InstanceType<typeof AdmZip>;

type CachedEpubArchive = {
  key: string;
  mtimeMs: number;
  size: number;
  zip: AdmZipArchive;
  lastAccessedAt: number;
};

@Injectable()
export class EpubArchiveCacheService {
  private readonly maxEntries = 16;
  private readonly maxBytes = 128 * 1024 * 1024;
  private readonly cache = new Map<string, CachedEpubArchive>();
  private cachedBytes = 0;

  constructor(@Inject(STORAGE_SERVICE_TOKEN) private readonly storage: IStorageService) {}

  async getArchive(key: string): Promise<AdmZipArchive> {
    const stats = await this.storage.getFileStats(key);
    const cached = this.cache.get(key);
    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      cached.lastAccessedAt = Date.now();
      return cached.zip;
    }

    if (cached) {
      this.remove(key);
    }

    const { buffer } = await this.storage.getFileBuffer(key);
    const zip = new AdmZip(buffer);
    this.add({
      key,
      mtimeMs: stats.mtimeMs,
      size: buffer.byteLength,
      zip,
      lastAccessedAt: Date.now(),
    });
    return zip;
  }

  private add(entry: CachedEpubArchive): void {
    if (entry.size > this.maxBytes) {
      return;
    }

    this.cache.set(entry.key, entry);
    this.cachedBytes += entry.size;
    this.evictOverflow();
  }

  private evictOverflow(): void {
    while (this.cache.size > this.maxEntries || this.cachedBytes > this.maxBytes) {
      const oldest = [...this.cache.values()].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)[0];
      if (!oldest) {
        return;
      }
      this.remove(oldest.key);
    }
  }

  private remove(key: string): void {
    const cached = this.cache.get(key);
    if (!cached) {
      return;
    }
    this.cachedBytes -= cached.size;
    this.cache.delete(key);
  }
}
