import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileProcessingQueueService } from 'src/modules/queue/file-processing-queue.service';
import { LibraryScanQueueService } from 'src/modules/queue/library-scan-queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'library-scan' }, { name: 'file-processing' }),
  ],
  providers: [FileProcessingQueueService, LibraryScanQueueService],
  exports: [BullModule, FileProcessingQueueService, LibraryScanQueueService],
})
export class QueueModule {}
