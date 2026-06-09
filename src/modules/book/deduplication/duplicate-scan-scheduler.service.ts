import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Match the library scan interval from FileWatcherService
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class DuplicateScanSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DuplicateScanSchedulerService.name);

  constructor(@InjectQueue('duplicate-scan') private readonly scanQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('DuplicateScanSchedulerService initialized');
    await this.enqueueScan();
  }

  @Interval(INTERVAL_MS)
  async enqueueScan(): Promise<void> {
    await this.scanQueue.add('scan-duplicates', {});
    this.logger.debug('Duplicate scan job enqueued');
  }
}
