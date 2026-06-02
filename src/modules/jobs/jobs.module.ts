import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobController } from 'src/modules/jobs/jobs.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { JobEventsService } from 'src/modules/jobs/job-events.service';
import { JobsService } from 'src/modules/jobs/jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'library-scan' }, { name: 'file-processing' }, { name: 'duplicate-scan' }),
    AuthModule,
  ],
  controllers: [JobController],
  providers: [JobEventsService, JobsService],
})
export class JobsModule {}
