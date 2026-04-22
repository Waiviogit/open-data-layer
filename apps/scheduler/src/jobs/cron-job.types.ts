import type { JsonValue } from '@opden-data-layer/core';

export type JobCategory = 'light' | 'batch' | 'critical';

export type JobHandlerContext = {
  jobName: string;
  runId: string;
  attempt: number;
  payload: JsonValue | null;
  signal: AbortSignal;
};

export type CronJobHandler = (ctx: JobHandlerContext) => Promise<void>;

export type CronJobDefinition = {
  name: string;
  /** 5-field cron (minute hour dom mon dow), e.g. `15 * * * *` */
  schedule: string;
  /** When false, job is not registered and not runnable via CLI. */
  enabled?: boolean;
  category: JobCategory;
  /** Hard limit for handler; enforced via AbortSignal. */
  timeoutMs: number;
  /** Short-lived Redis lock while enqueueing (multi-replica safety). */
  lockTtlSec: number;
  /** Retries after the first failure (0 = a single try only). */
  retryCount: number;
  /** Delay before the next try after a failed attempt. */
  retryDelayMs: number;
  /**
   * When false, skip enqueue if an incomplete run (pending or running) already exists
   * for this job. Record a skipped run row for traceability.
   */
  allowOverlap: boolean;
  run: CronJobHandler;
};
