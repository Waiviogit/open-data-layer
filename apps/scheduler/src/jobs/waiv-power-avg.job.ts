import { Logger } from '@nestjs/common';
import type { CronJobDefinition } from './cron-job.types';
import { getWaivPowerAvgRunnerForJob } from './waiv-power-avg.runner';

const logger = new Logger('waiv-power-avg');

/**
 * Daily WAIV power rolling average: snapshot dirty users, recompute 30-day
 * time-weighted average into user_object_powers.waiv_power, prune history.
 */
export const waivPowerAvgJob: CronJobDefinition = {
  name: 'waiv-power-avg',
  schedule: '30 3 * * *',
  category: 'batch',
  enabled: true,
  timeoutMs: 3_600_000,
  lockTtlSec: 60,
  retryCount: 0,
  retryDelayMs: 10_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`run ${ctx.runId} attempt ${ctx.attempt}`);
    await getWaivPowerAvgRunnerForJob().run(ctx);
  },
};
