import { validateChainIndexer } from './env.validation';

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
      handlers: {
        customJson: {
          enabled: process.env.HANDLER_CUSTOM_JSON_ENABLED !== 'false',
        },
      },
      customJsonHandlers: {},
    },
  };
};
