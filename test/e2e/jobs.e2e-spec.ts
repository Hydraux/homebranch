import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { JobController } from 'src/modules/jobs/jobs.controller';
import { JobEventsService } from 'src/modules/jobs/job-events.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { of } from 'rxjs';

describe('JobController (e2e)', () => {
  let app: INestApplication<App>;

  const mockJobsService = {
    listJobs: jest.fn(),
    getJob: jest.fn(),
  };

  const mockJobEventsService = {
    getStream: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        { provide: JobsService, useValue: mockJobsService },
        { provide: JobEventsService, useValue: mockJobEventsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  test('lists jobs with plain response payload', async () => {
    mockJobsService.listJobs.mockResolvedValueOnce({
      data: [{ id: '1', name: 'scan', queue: 'library-scan', status: 'waiting' }],
      total: 1,
      limit: 20,
      offset: 0,
    });

    const response = await request(app.getHttpServer()).get('/jobs').expect(200);

    expect(response.body.total).toBe(1);
    expect(mockJobsService.listJobs).toHaveBeenCalledWith(undefined, undefined, 20, 0);
  });

  test('gets one job with plain response payload', async () => {
    mockJobsService.getJob.mockResolvedValueOnce({ id: '1', name: 'scan', queue: 'library-scan', status: 'waiting' });

    const response = await request(app.getHttpServer()).get('/jobs/1').expect(200);

    expect(response.body.id).toBe('1');
    expect(mockJobsService.getJob).toHaveBeenCalledWith('1');
  });

  test('streams job events through sse endpoint', async () => {
    mockJobEventsService.getStream.mockReturnValueOnce(of({ data: 'hello' }));

    await request(app.getHttpServer()).get('/jobs/stream').expect(200);

    expect(mockJobEventsService.getStream).toHaveBeenCalled();
  });
});
