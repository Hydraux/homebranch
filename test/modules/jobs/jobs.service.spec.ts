import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { JobsService } from 'src/modules/jobs/jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let libraryScanQueue: { name: string; getJobs: jest.Mock; getJob: jest.Mock };
  let fileProcessingQueue: { name: string; getJobs: jest.Mock; getJob: jest.Mock };
  let duplicateScanQueue: { name: string; getJobs: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    libraryScanQueue = { name: 'library-scan', getJobs: jest.fn(), getJob: jest.fn() };
    fileProcessingQueue = { name: 'file-processing', getJobs: jest.fn(), getJob: jest.fn() };
    duplicateScanQueue = { name: 'duplicate-scan', getJobs: jest.fn(), getJob: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getQueueToken('library-scan'), useValue: libraryScanQueue },
        { provide: getQueueToken('file-processing'), useValue: fileProcessingQueue },
        { provide: getQueueToken('duplicate-scan'), useValue: duplicateScanQueue },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('lists jobs across queues sorted by created time desc', async () => {
    const olderJob = {
      id: '1',
      name: 'older',
      progress: 0,
      data: {},
      returnvalue: null,
      failedReason: '',
      timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(),
      processedOn: undefined,
      finishedOn: undefined,
      getState: jest.fn().mockResolvedValue('waiting'),
    };
    const newerJob = {
      id: '2',
      name: 'newer',
      progress: 50,
      data: {},
      returnvalue: null,
      failedReason: '',
      timestamp: new Date('2024-01-02T00:00:00.000Z').getTime(),
      processedOn: undefined,
      finishedOn: undefined,
      getState: jest.fn().mockResolvedValue('active'),
    };

    libraryScanQueue.getJobs.mockResolvedValueOnce([olderJob]);
    fileProcessingQueue.getJobs.mockResolvedValueOnce([newerJob]);
    duplicateScanQueue.getJobs.mockResolvedValueOnce([]);

    const result = await service.listJobs(undefined, undefined, 20, 0);

    expect(result.total).toBe(2);
    expect(result.data.map((job) => job.id)).toEqual(['2', '1']);
  });

  test('filters job listing to a single queue when requested', async () => {
    fileProcessingQueue.getJobs.mockResolvedValueOnce([]);

    await service.listJobs(undefined, 'file-processing', 10, 5);

    expect(fileProcessingQueue.getJobs).toHaveBeenCalledWith(
      ['active', 'waiting', 'completed', 'failed', 'delayed'],
      5,
      14,
    );
    expect(libraryScanQueue.getJobs).not.toHaveBeenCalled();
    expect(duplicateScanQueue.getJobs).not.toHaveBeenCalled();
  });

  test('returns a single job with attempts when found', async () => {
    const queueJob = {
      id: 'job-1',
      name: 'scan',
      progress: 100,
      data: { path: 'a' },
      returnvalue: { ok: true },
      failedReason: '',
      timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(),
      processedOn: new Date('2024-01-01T00:01:00.000Z').getTime(),
      finishedOn: new Date('2024-01-01T00:02:00.000Z').getTime(),
      attemptsMade: 1,
      getState: jest.fn().mockResolvedValue('completed'),
    };

    libraryScanQueue.getJob.mockResolvedValueOnce(queueJob);

    const result = await service.getJob('job-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-1',
        queue: 'library-scan',
        status: 'completed',
        attemptsMade: 1,
      }),
    );
  });

  test('returns null when job is missing from all queues', async () => {
    libraryScanQueue.getJob.mockResolvedValueOnce(null);
    fileProcessingQueue.getJob.mockResolvedValueOnce(null);
    duplicateScanQueue.getJob.mockResolvedValueOnce(null);

    await expect(service.getJob('missing')).resolves.toBeNull();
  });
});
