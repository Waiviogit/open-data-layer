import { z } from 'zod';
import { HIVE_ENGINE_NODES } from '@opden-data-layer/clients';

const DEFAULT_HIVE_ENGINE_NODES = [...HIVE_ENGINE_NODES];

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
    .url()
    .optional()
    .default('https://example.com'),
  SITE_CANONICAL_DAILY_PAGE_SIZE: z.coerce.number().optional().default(100),
  COINGECKO_API_BASE_URL: z
    .url()
    .optional()
    .default('https://api.coingecko.com/api/v3'),
  /** Optional: CoinGecko Demo (`x-cg-demo-api-key`) or Pro (`x-cg-pro-api-key` when base URL is pro-api). */
  COINGECKO_API_KEY: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  EXCHANGE_RATE_HOST_BASE_URL: z
    .url()
    .optional()
    .default('https://api.exchangerate.host'),
  EXCHANGE_RATE_ACCESS_KEY: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  /**
   * Comma-separated Hive Engine JSON-RPC origins; omit for built-in defaults
   * (`HIVE_ENGINE_NODES` in `@opden-data-layer/clients`).
   */
  HIVE_ENGINE_NODES: z
    .string()
    .optional()
    .transform((s) => {
      if (!s || s.trim().length === 0) {
        return [...DEFAULT_HIVE_ENGINE_NODES];
      }
      const parsed = s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      return parsed.length > 0 ? parsed : [...DEFAULT_HIVE_ENGINE_NODES];
    }),
  CURRENCY_EXTERNAL_REQUEST_TIMEOUT_MS: z.coerce.number().optional().default(12_000),
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
