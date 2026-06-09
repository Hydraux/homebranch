import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DuplicateScanQueueService {
  constructor(@InjectQueue('duplicate-scan') private readonly scanQueue: Queue) {}

  async enqueueScan(): Promise<void> {
    await this.scanQueue.add('scan-duplicates', {});
  }
}
