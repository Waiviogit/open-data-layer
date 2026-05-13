import { Logger } from '@nestjs/common';
import type { CronJobDefinition } from './cron-job.types';
import { getCurrencyCollectRunner } from './currency-collect.runner';

const logger = new Logger('currency-jobs');

const ORD_TIMEOUT_MS = 120_000;
const DAILY_TIMEOUT_MS = 600_000;
const SCHEDULE_EVERY_FIVE_UTC_CRON_MIN = '*/5 * * * *';

/** CoinGecko HIVE+HBD snapshots at ~5-minute cadence. */
export const currencyCoinGeckoOrdinaryJob: CronJobDefinition = {
  name: 'currency-coingecko-ordinary',
  schedule: SCHEDULE_EVERY_FIVE_UTC_CRON_MIN,
  category: 'light',
  enabled: true,
  timeoutMs: ORD_TIMEOUT_MS,
  lockTtlSec: 45,
  retryCount: 1,
  retryDelayMs: 15_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`${ctx.jobName} run ${ctx.runId} attempt ${ctx.attempt}`);
    await getCurrencyCollectRunner().coinGeckoOrdinary(ctx);
  },
};

/** Hive Engine WAIV diesel snapshot at ~5-minute cadence. */
export const currencyHiveEngineOrdinaryJob: CronJobDefinition = {
  name: 'currency-hive-engine-ordinary',
  schedule: SCHEDULE_EVERY_FIVE_UTC_CRON_MIN,
  category: 'light',
  enabled: true,
  timeoutMs: ORD_TIMEOUT_MS,
  lockTtlSec: 45,
  retryCount: 1,
  retryDelayMs: 15_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`${ctx.jobName} run ${ctx.runId} attempt ${ctx.attempt}`);
    await getCurrencyCollectRunner().hiveEngineOrdinary(ctx);
  },
};

/** Rolls up previous UTC day’s ordinary Hive/HBD snapshots into `currency_statistics` daily row (~00:13 UTC). */
export const currencyCoinGeckoDailyJob: CronJobDefinition = {
  name: 'currency-coingecko-daily',
  schedule: '13 0 * * *',
  category: 'batch',
  enabled: true,
  timeoutMs: DAILY_TIMEOUT_MS,
  lockTtlSec: 180,
  retryCount: 0,
  retryDelayMs: 30_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`${ctx.jobName} run ${ctx.runId} attempt ${ctx.attempt}`);
    await getCurrencyCollectRunner().coinGeckoDaily(ctx);
  },
};

/** Persist FX fiat columns into `currency_rates` (daily). */
export const currencyFxDailyJob: CronJobDefinition = {
  name: 'currency-fx-daily',
  schedule: '5 1 * * *',
  category: 'light',
  enabled: true,
  timeoutMs: DAILY_TIMEOUT_MS,
  lockTtlSec: 180,
  retryCount: 1,
  retryDelayMs: 30_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`${ctx.jobName} run ${ctx.runId} attempt ${ctx.attempt}`);
    await getCurrencyCollectRunner().fxDaily(ctx);
  },
};

/** WAIV Hive Engine daily aggregate + prior-day deltas (~00:20 UTC). */
export const currencyHiveEngineDailyJob: CronJobDefinition = {
  name: 'currency-hive-engine-daily',
  schedule: '20 0 * * *',
  category: 'batch',
  enabled: true,
  timeoutMs: DAILY_TIMEOUT_MS,
  lockTtlSec: 180,
  retryCount: 0,
  retryDelayMs: 30_000,
  allowOverlap: false,
  run: async (ctx) => {
    logger.log(`${ctx.jobName} run ${ctx.runId} attempt ${ctx.attempt}`);
    await getCurrencyCollectRunner().hiveEngineDaily(ctx);
  },
};

export const currencyCronJobDefinitions: CronJobDefinition[] = [
  currencyCoinGeckoOrdinaryJob,
  currencyHiveEngineOrdinaryJob,
  currencyCoinGeckoDailyJob,
  currencyFxDailyJob,
  currencyHiveEngineDailyJob,
];
