import { z } from 'zod';

function parseDisabledJobs(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    return new Set<string>();
  }
  return new Set<string>(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export const schedulerConfigSchema = z.object({
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(5),
  SCHEDULER_WORKER_INTERVAL_MS: z.coerce.number().optional().default(2_000),
  SCHEDULER_WORKER_BATCH_SIZE: z.coerce.number().optional().default(5),
  SCHEDULER_GLOBAL_ENABLED: z
    .string()
    .optional()
    .default('true')
    .transform((s) => s !== 'false'),
  SCHEDULER_DISABLED_JOBS: z
    .string()
    .optional()
    .default('')
    .transform(parseDisabledJobs),
  SCHEDULER_DEFAULT_LOCK_TTL_MAX_SEC: z.coerce.number().optional().default(30),
  SCHEDULER_ENQUEUE_LOCK_TOKEN_TTL_SEC: z.coerce.number().optional().default(30),
  /** HTTPS origin for per-object fallback URLs; must match chain-indexer / query-api. */
  SITE_CANONICAL_FALLBACK_ORIGIN: z
    .string()
    .url()
    .optional()
    .default('https://example.com'),
  SITE_CANONICAL_DAILY_PAGE_SIZE: z.coerce.number().optional().default(100),
});

export type SchedulerEnv = z.infer<typeof schedulerConfigSchema>;

export function validateScheduler(
  config: Record<string, unknown>,
): SchedulerEnv {
  const result = schedulerConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
