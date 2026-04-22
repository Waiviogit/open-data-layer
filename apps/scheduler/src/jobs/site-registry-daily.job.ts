 import { Logger } from '@nestjs/common';
import type { CronJobDefinition } from './cron-job.types';
import { getSiteRegistryDailyRunnerForJob } from './site-registry-daily.runner';

const logger = new Logger('site-registry-daily');

/**
 * Daily health sweep over `site_registry`: anti-flap threshold 3 before bulk fallback
 * on `objects_core` rows for the creator.
 */
export const siteRegistryDailyJob: CronJobDefinition = {
  name: 'site-registry-daily',
  schedule: '15 2 * * *',
  category: 'batch',
  enabled: true,
  timeoutMs: 3_600_000,
  lockTtlSec: 60,
  retryCount: 0,
  retryDelayMs: 10_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`run ${ctx.runId} attempt ${ctx.attempt}`);
    await getSiteRegistryDailyRunnerForJob().run(ctx);
  },
};
