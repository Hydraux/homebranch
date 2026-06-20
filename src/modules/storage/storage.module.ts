import { Module } from '@nestjs/common';
import { IStorageService, STORAGE_SERVICE_TOKEN } from './storage.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../common/types/env.interface';
import LocalStorage from './local-storage';
import { R2Storage } from './r2-storage';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>): IStorageService => {
        const useLocalStorage = configService.get<'local' | 'r2'>('STORAGE_LOCATION', 'local') === 'local';
        if (useLocalStorage) {
          return new LocalStorage(configService);
        } else {
          return new R2Storage(configService);
        }
      },
    },
  ],
  exports: [STORAGE_SERVICE_TOKEN],
})
export class StorageModule {}
