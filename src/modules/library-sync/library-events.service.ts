import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, merge, timer } from 'rxjs';
import { map, share } from 'rxjs/operators';

export type LibraryEvent =
  | { type: 'book-added'; bookId: string }
  | { type: 'book-removed'; bookId: string }
  | { type: 'book-updated'; bookId: string };

const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class LibraryEventsService implements OnModuleDestroy {
  private readonly events$ = new Subject<LibraryEvent>();

  private readonly stream$: Observable<MessageEvent> = merge(
    this.events$.pipe(map((event) => ({ data: JSON.stringify(event) }) as MessageEvent)),
    timer(HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) }) as MessageEvent),
    ),
  ).pipe(share());

  emit(event: LibraryEvent): void {
    this.events$.next(event);
  }

  getStream(): Observable<MessageEvent> {
    return this.stream$;
  }

  onModuleDestroy() {
    this.events$.complete();
  }
}
