import { validateQueryApi } from './env.validation';


export default () => {
  const env = validateQueryApi(
    process.env as unknown as Record<string, unknown>,
  );
  const externalTimeoutMs = env.CURRENCY_EXTERNAL_REQUEST_TIMEOUT_MS;
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
      contentBaseUrl: env.IPFS_CONTENT_BASE_URL,
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
    currency: {
      exchangeRate: {
        baseUrl: env.EXCHANGE_RATE_HOST_BASE_URL,
        accessKey: env.EXCHANGE_RATE_ACCESS_KEY,
        requestTimeoutMs: env.CURRENCY_EXTERNAL_REQUEST_TIMEOUT_MS,
      },
    },
    hiveEngine: {
      client: {
        nodes: env.HIVE_ENGINE_NODES,
        cachePrefix: 'query-api:hive-engine',
        cacheTtlSeconds: 1200,
        maxResponseTimeMs: 8000,
        urlRotationDb: 0,
      },
      historyClient: {
        nodes: env.HIVE_ENGINE_HISTORY_NODES,
        cachePrefix: env.HIVE_ENGINE_HISTORY_CACHE_PREFIX,
        cacheTtlSeconds: 1200,
        maxResponseTimeMs: env.HIVE_ENGINE_HISTORY_MAX_RESPONSE_TIME_MS,
        urlRotationDb: env.HIVE_ENGINE_HISTORY_URL_ROTATION_DB,
      },
      convertClient: {
        baseUrl: env.HIVE_ENGINE_CONVERT_BASE_URL,
        requestTimeoutMs: externalTimeoutMs,
      },
      tribaldexClient: {
        baseUrl: env.TRIBALDEX_BASE_URL,
        requestTimeoutMs: externalTimeoutMs,
      },
      ethGatewayClient: {
        baseUrl: env.ETH_GATEWAY_BASE_URL,
        requestTimeoutMs: externalTimeoutMs,
      },
    },
    changelly: {
      privateKeyHex: env.CHANGELLY_PRIVATE_KEY,
      baseUrl: env.CHANGELLY_BASE_URL,
      requestTimeoutMs: externalTimeoutMs,
    },
    geoip: {
      dbPath: env.GEOIP_DB_PATH,
    },
    http: {
      trustProxy: env.TRUST_PROXY,
    },
  };
};
