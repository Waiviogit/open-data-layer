import { validateScheduler } from './env.validation';

export default () => {
  const env = validateScheduler(
    process.env as unknown as Record<string, unknown>,
  );
  return {
    postgres: {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DATABASE,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      poolMax: env.POSTGRES_POOL_MAX,
    },
    redis: {
      uri: env.REDIS_URI,
    },
    scheduler: {
      workerIntervalMs: env.SCHEDULER_WORKER_INTERVAL_MS,
      workerBatchSize: env.SCHEDULER_WORKER_BATCH_SIZE,
      globalEnabled: env.SCHEDULER_GLOBAL_ENABLED,
      disabledJobNames: env.SCHEDULER_DISABLED_JOBS,
      defaultLockTtlMaxSec: env.SCHEDULER_DEFAULT_LOCK_TTL_MAX_SEC,
      enqueueLockTokenTtlSec: env.SCHEDULER_ENQUEUE_LOCK_TOKEN_TTL_SEC,
    },
    siteCanonical: {
      fallbackOrigin: env.SITE_CANONICAL_FALLBACK_ORIGIN,
      dailyPageSize: env.SITE_CANONICAL_DAILY_PAGE_SIZE,
    },
  };
};
