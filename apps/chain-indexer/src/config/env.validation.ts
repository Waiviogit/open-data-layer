import { z } from 'zod';

export const chainIndexerConfigSchema = z.object({
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  START_BLOCK_NUMBER: z.coerce.number().optional().default(102138605),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
  // Hive RPC client / URL rotation
  HIVE_CACHE_PREFIX: z.string().optional(),
  HIVE_CACHE_TTL_SECONDS: z.coerce.number().optional(),
  HIVE_MAX_RESPONSE_TIME_MS: z.coerce.number().optional(),
  HIVE_URL_ROTATION_DB: z.coerce.number().optional(),
  ODL_NETWORK: z.enum(['mainnet', 'testnet']).optional().default('mainnet'),
  IPFS_API_URL: z.string().url().optional().default('http://localhost:5001'),
  IPFS_GATEWAY_URL: z.string().url().optional(),
  BATCH_IMPORT_MAX_RETRIES: z.coerce.number().optional().default(3),
  BATCH_IMPORT_RETRY_DELAY_MS: z.coerce.number().optional().default(1000),
  POST_SYNC_INTERVAL_MS: z.coerce.number().optional().default(30_000),
  POST_SYNC_BATCH_SIZE: z.coerce.number().optional().default(50),
  POST_SYNC_MAX_ATTEMPTS: z.coerce.number().optional().default(5),
  ACCOUNT_SYNC_INTERVAL_MS: z.coerce.number().optional().default(30_000),
  ACCOUNT_SYNC_BATCH_SIZE: z.coerce.number().optional().default(20),
  ACCOUNT_SYNC_MAX_ATTEMPTS: z.coerce.number().optional().default(5),
  GOVERNANCE_OBJECT_ID: z.string().optional().default(''),
  /** Origin for `buildFallbackCanonicalUrl` (https only), e.g. `https://fallback.example.com` */
  CANONICAL_FALLBACK_ORIGIN: z
    .string()
    .url()
    .optional()
    .default('https://example.com'),
  CANONICAL_ACCOUNT_CACHE_TTL_SEC: z.coerce.number().optional().default(600),
  CANONICAL_RECOMPUTE_INTERVAL_MS: z.coerce.number().optional().default(2_000),
  CANONICAL_RECOMPUTE_BATCH_SIZE: z.coerce.number().optional().default(5),
});

export type ChainIndexerConfig = z.infer<typeof chainIndexerConfigSchema>;

export function validateChainIndexer(
  config: Record<string, unknown>,
): ChainIndexerConfig {
  const result = chainIndexerConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
