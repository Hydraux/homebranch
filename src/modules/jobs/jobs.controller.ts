import { Controller, Get, Param, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { JobEventsService } from 'src/modules/jobs/job-events.service';
import { JobsService } from 'src/modules/jobs/jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobEventsService: JobEventsService,
  ) {}

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  streamJobs(): Observable<MessageEvent> {
    return this.jobEventsService.getStream();
  }

  @Get()
  async listJobs(
    @Query('status') status?: string,
    @Query('queue') queue?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.jobsService.listJobs(status, queue, Number(limit), Number(offset));
  }

  @Get(':id')
  async getJob(@Param('id') jobId: string) {
    return this.jobsService.getJob(jobId);
  }
}
