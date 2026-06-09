export interface JobInfo {
  id: string | undefined;
  name: string;
  queue: string;
  status: string;
  progress: unknown;
  data: unknown;
  result: unknown;
  failedReason: string;
  createdAt: string | null;
  processedAt: string | null;
  finishedAt: string | null;
  attemptsMade?: number;
}

export interface JobListResult {
  data: JobInfo[];
  total: number;
  limit: number;
  offset: number;
}
