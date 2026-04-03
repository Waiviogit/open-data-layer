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
  };
};
