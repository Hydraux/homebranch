import { Test, TestingModule } from '@nestjs/testing';
import { DuplicateScanSchedulerService } from 'src/modules/book/deduplication/duplicate-scan-scheduler.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('DuplicateScanSchedulerService', () => {
  let service: DuplicateScanSchedulerService;
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateScanSchedulerService,
        {
          provide: getQueueToken('duplicate-scan'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<DuplicateScanSchedulerService>(DuplicateScanSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Enqueues a scan job on module init', async () => {
    await service.onModuleInit();

    expect(mockQueue.add).toHaveBeenCalledWith('scan-duplicates', {});
  });

  test('Enqueues a scan job when enqueueScan is called directly', async () => {
    await service.enqueueScan();

    expect(mockQueue.add).toHaveBeenCalledWith('scan-duplicates', {});
  });

  test('Each enqueue call adds exactly one job', async () => {
    await service.enqueueScan();
    await service.enqueueScan();

    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });
});
