import { validateChainIndexer } from './env.validation';
import { CUSTOM_JSON_ID } from '../constants/hive-parser';

export default () => {
  const env = validateChainIndexer(
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
    hive: {
      startBlockNumber: env.START_BLOCK_NUMBER,
      blockNumberKey: env.BLOCK_NUMBER_KEY,
      client: {
        cachePrefix: env.HIVE_CACHE_PREFIX,
        cacheTtlSeconds: env.HIVE_CACHE_TTL_SECONDS,
        maxResponseTimeMs: env.HIVE_MAX_RESPONSE_TIME_MS,
        urlRotationDb: env.HIVE_URL_ROTATION_DB,
      },
      handlers: {
        customJson: {
          enabled: process.env.HANDLER_CUSTOM_JSON_ENABLED !== 'false',
        },
        /** Hive `custom_json` id=follow (follow / reblog / ignore). */
        hiveFollowEnabled: process.env.HANDLER_HIVE_FOLLOW_ENABLED !== 'false',
      },
      customJsonHandlers: {},
      odlCustomJsonId:
        env.ODL_NETWORK === 'testnet'
          ? CUSTOM_JSON_ID.ODL_TESTNET
          : CUSTOM_JSON_ID.ODL_MAINNET,
    },
    ipfs: {
      apiUrl: env.IPFS_API_URL,
      gatewayUrl: env.IPFS_GATEWAY_URL,
    },
    batchImport: {
      maxRetries: env.BATCH_IMPORT_MAX_RETRIES,
      retryDelayMs: env.BATCH_IMPORT_RETRY_DELAY_MS,
    },
  };
};
