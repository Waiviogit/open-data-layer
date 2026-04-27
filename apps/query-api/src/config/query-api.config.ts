import { validateQueryApi } from './env.validation';


export default () => {
  const env = validateQueryApi(
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
    governance: {
      objectId: env.GOVERNANCE_OBJECT_ID,
    },
    ipfs: {
      gatewayUrl: env.IPFS_GATEWAY_URL,
    },
    siteCanonical: {
      fallbackOrigin: env.SITE_CANONICAL_FALLBACK_ORIGIN,
    },
    jwt: {
      secret: env.JWT_SECRET,
    },
    hive: {
      client: {
        cachePrefix: env.HIVE_CACHE_PREFIX,
        cacheTtlSeconds: env.HIVE_CACHE_TTL_SECONDS,
        maxResponseTimeMs: env.HIVE_MAX_RESPONSE_TIME_MS,
        urlRotationDb: env.HIVE_URL_ROTATION_DB,
      },
    },
  };
};
