import { z } from 'zod';
import { HIVE_ENGINE_NODES } from '@opden-data-layer/clients';

const DEFAULT_HIVE_ENGINE_NODES = [...HIVE_ENGINE_NODES];

export const queryApiConfigSchema = z.object({
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
  GOVERNANCE_OBJECT_ID: z.string().optional().default(''),
  /** Public gateway origin (no path). URLs are built as `{origin}/ipfs/{cid}`. */
  IPFS_GATEWAY_URL: z
    .url()
    .optional()
    .default('https://ipfs.io'),
  /**
   * HTTPS origin for object canonical when `objects_core.canonical` is null;
   * must match chain-indexer / scheduler fallback.
   */
  SITE_CANONICAL_FALLBACK_ORIGIN: z
    .url()
    .optional()
    .default('https://example.com'),
  /** Must match auth-api JWT_SECRET for access token verification. */
  JWT_SECRET: z.string().min(1),
  /** Hive RPC client / URL rotation (optional; aligns with chain-indexer). */
  HIVE_CACHE_PREFIX: z.string().optional(),
  HIVE_CACHE_TTL_SECONDS: z.coerce.number().optional(),
  HIVE_MAX_RESPONSE_TIME_MS: z.coerce.number().optional(),
  HIVE_URL_ROTATION_DB: z.coerce.number().optional(),
  EXCHANGE_RATE_HOST_BASE_URL: z
    .url()
    .optional()
    .default('https://api.exchangerate.host'),
  EXCHANGE_RATE_ACCESS_KEY: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
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

export type QueryApiConfig = z.infer<typeof queryApiConfigSchema>;

export function validateQueryApi(
  config: Record<string, unknown>,
): QueryApiConfig {
  const result = queryApiConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
