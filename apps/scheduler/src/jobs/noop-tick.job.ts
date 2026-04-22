import { Logger } from '@nestjs/common';
import type { CronJobDefinition } from './cron-job.types';

const logger = new Logger('NoopTickJob');

/**
 * Idempotent no-op: safe to re-run. Used as a wiring smoke test.
 * Runs once a day at 04:00 UTC to avoid local dev noise; override schedule in a real job if needed.
 */
export const noopTickJob: CronJobDefinition = {
  name: 'noop-tick',
  schedule: '0 4 * * *',
  category: 'light',
  enabled: true,
  timeoutMs: 5_000,
  lockTtlSec: 15,
  retryCount: 1,
  retryDelayMs: 1_000,
  allowOverlap: false,
  run: async () => {
    logger.log('noop-tick: ok');
  },
};
