import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobState, Queue } from 'bullmq';
import { JobInfo, JobListResult } from 'src/modules/jobs/job.types';

@Injectable()
export class JobsService {
  private readonly queues: Queue[];

  constructor(
    @InjectQueue('library-scan') libraryScanQueue: Queue,
    @InjectQueue('file-processing') fileProcessingQueue: Queue,
    @InjectQueue('duplicate-scan') duplicateScanQueue: Queue,
  ) {
    this.queues = [libraryScanQueue, fileProcessingQueue, duplicateScanQueue];
  }

  async listJobs(status?: string, queue?: string, limit = 20, offset = 0): Promise<JobListResult> {
    const targetQueues = queue ? this.queues.filter((candidate) => candidate.name === queue) : this.queues;
    const states: JobState[] = status ? [status as JobState] : ['active', 'waiting', 'completed', 'failed', 'delayed'];

    const allJobs: JobInfo[] = [];
    for (const targetQueue of targetQueues) {
      const jobs = await targetQueue.getJobs(states, offset, offset + limit - 1);
      for (const job of jobs) {
        const state = await job.getState();
        allJobs.push({
          id: job.id,
          name: job.name,
          queue: targetQueue.name,
          status: state,
          progress: job.progress,
          data: job.data as unknown,
          result: job.returnvalue as unknown,
          failedReason: job.failedReason,
          createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
          processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        });
      }
    }

    allJobs.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return {
      data: allJobs.slice(0, limit),
      total: allJobs.length,
      limit,
      offset,
    };
  }

  async getJob(jobId: string): Promise<JobInfo | null> {
    for (const targetQueue of this.queues) {
      const job = await targetQueue.getJob(jobId);
      if (!job) {
        continue;
      }

      const state = await job.getState();
      return {
        id: job.id,
        name: job.name,
        queue: targetQueue.name,
        status: state,
        progress: job.progress,
        data: job.data as unknown,
        result: job.returnvalue as unknown,
        failedReason: job.failedReason,
        createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        attemptsMade: job.attemptsMade,
      };
    }

    return null;
  }
}
