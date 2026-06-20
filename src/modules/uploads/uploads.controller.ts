import { Controller, Get, Param, Res, StreamableFile, Inject, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { IStorageService, STORAGE_SERVICE_TOKEN } from '../storage/storage.interface';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/common/types/env.interface';
import { posix } from 'path';

const PUBLIC_UPLOAD_PREFIXES = ['cover-images/', 'author-images/'];

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storage: IStorageService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  @Get('*key')
  async getFile(@Param('key') key: string | string[], @Res({ passthrough: true }) res: Response) {
    const storageLocation = this.configService.get<string>('STORAGE_LOCATION', 'local');
    key = this.normalizePublicKey(key);
    if (storageLocation === 'r2') {
      const url = await this.storage.getDownloadUrl(key);
      return res.redirect(url);
    }

    const { stream, mimeType, size } = await this.storage.getFileStream(key);
    res.set({
      'Content-Type': mimeType,
      'Content-Length': size,
    });
    return new StreamableFile(stream);
  }

  private normalizePublicKey(key: string | string[]): string {
    const rawKey = Array.isArray(key) ? key.join('/') : key;
    const normalizedKey = posix.normalize(rawKey.replace(/,/g, '/')).replace(/^\/+/, '');

    if (
      normalizedKey === '.' ||
      normalizedKey.startsWith('../') ||
      !PUBLIC_UPLOAD_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))
    ) {
      throw new NotFoundException('Requested file not found');
    }

    return normalizedKey;
  }
}
