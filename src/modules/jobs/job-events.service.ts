import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { Observable, Subject, merge, timer } from 'rxjs';
import { map, share } from 'rxjs/operators';

export type JobEvent = { type: string; jobId: string; queue: string; progress?: number };

const HEARTBEAT_INTERVAL_MS = 30_000;
const QUEUE_NAMES = ['library-scan', 'file-processing', 'duplicate-scan'] as const;

@Injectable()
export class JobEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobEventsService.name);
  private readonly events$ = new Subject<JobEvent>();
  private readonly queueEventListeners: QueueEvents[] = [];

  private readonly stream$: Observable<MessageEvent> = merge(
    this.events$.pipe(map((event) => ({ data: JSON.stringify(event) }) as MessageEvent)),
    timer(HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) }) as MessageEvent),
    ),
  ).pipe(share());

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const connection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    };

    for (const queueName of QUEUE_NAMES) {
      const queueEvents = new QueueEvents(queueName, { connection });

      queueEvents.on('added', ({ jobId }) => {
        this.events$.next({ type: 'added', jobId, queue: queueName });
      });
      queueEvents.on('active', ({ jobId }) => {
        this.events$.next({ type: 'active', jobId, queue: queueName });
      });
      queueEvents.on('progress', ({ jobId, data }) => {
        this.events$.next({ type: 'progress', jobId, queue: queueName, progress: data as number });
      });
      queueEvents.on('completed', ({ jobId }) => {
        this.events$.next({ type: 'completed', jobId, queue: queueName });
      });
      queueEvents.on('failed', ({ jobId }) => {
        this.events$.next({ type: 'failed', jobId, queue: queueName });
      });

      this.queueEventListeners.push(queueEvents);
      this.logger.log(`Listening to job events for queue: ${queueName}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.events$.complete();
    await Promise.all(this.queueEventListeners.map((queueEvents) => queueEvents.close()));
  }

  getStream(): Observable<MessageEvent> {
    return this.stream$;
  }
}
