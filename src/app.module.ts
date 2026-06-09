import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmConfigModule } from 'src/modules/typeorm/typeorm.module';
import { BooksModule } from 'src/modules/book/book.module';
import { BookShelvesModule } from 'src/modules/book-shelf/book-shelf.module';
import { SavedPositionsModule } from 'src/modules/saved-position/saved-position.module';
import { HealthModule } from 'src/modules/health/health.module';
import { AuthorsModule } from 'src/modules/author/author.module';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { OpdsModule } from 'src/modules/opds/opds.module';
import { QueueModule } from 'src/modules/queue/queue.module';
import { LibrarySyncModule } from 'src/modules/library-sync/library-sync.module';
import { JobsModule } from 'src/modules/jobs/jobs.module';

@Module({
  imports: [
    // Configuration first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    ScheduleModule.forRoot(),

    HealthModule,

    // Queue infrastructure
    QueueModule,

    // Database configuration
    TypeOrmConfigModule,

    // Feature modules
    BooksModule,
    BookShelvesModule,
    SavedPositionsModule,
    AuthorsModule,
    SettingsModule,
    OpdsModule,
    LibrarySyncModule,
    JobsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
