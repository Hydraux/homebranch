import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LibraryEventsService } from 'src/modules/library-sync/library-events.service';
import { Subscription } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';

// Debounce window to group rapid file events into a single duplicate scan
const DEBOUNCE_MS = 5000;

@Injectable()
export class DuplicateScanSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DuplicateScanSchedulerService.name);
  private subscription: Subscription | null = null;

  constructor(
    @InjectQueue('duplicate-scan') private readonly scanQueue: Queue,
    @Optional() private readonly libraryEvents?: LibraryEventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('DuplicateScanSchedulerService initialized (event-driven)');

    // If library events are available, subscribe and enqueue a duplicate scan after a debounce
    if (this.libraryEvents) {
      this.subscription = this.libraryEvents
        .getStream()
        .pipe(
          filter((msg: MessageEvent) => {
            try {
              const parsed = JSON.parse(String(msg.data)) as { type?: unknown } | null;
              const t = parsed?.type;
              return typeof t === 'string' && ['book-added', 'book-removed', 'book-updated'].includes(t);
            } catch {
              return false;
            }
          }),
          debounceTime(DEBOUNCE_MS),
        )
        .subscribe({
          next: () => {
            // Use promise chain to avoid providing an async function to subscribe
            this.scanQueue
              .add('scan-duplicates', {})
              .then(() => this.logger.debug('Duplicate scan job enqueued due to library event'))
              .catch((err) => this.logger.error(`Failed to enqueue duplicate scan: ${String(err)}`));
          },
          error: (err) => this.logger.error(`Library events stream error: ${String(err)}`),
        });
    }

    // Enqueue one initial scan on startup to ensure state
    await this.enqueueScan();
  }

  async enqueueScan(): Promise<void> {
    await this.scanQueue.add('scan-duplicates', {});
    this.logger.debug('Duplicate scan job enqueued (startup)');
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
