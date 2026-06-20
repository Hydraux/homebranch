import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [StorageModule, ConfigModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
