import { validateNotificationsEnv } from './env.validation';

export default () => {
  const env = validateNotificationsEnv(
    process.env as unknown as Record<string, unknown>,
  );
  return {
    port: env.PORT,
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
    jwt: {
      secret: env.JWT_SECRET,
    },
    subscription: {
      ttlSeconds: env.SUBSCRIPTION_TTL_SECONDS,
    },
    ws: {
      pingIntervalMs: env.WS_PING_INTERVAL_MS,
      /** Reserved for future explicit timeout logic; interval defines effective liveness window. */
      pingTimeoutMs: env.WS_PING_TIMEOUT_MS,
      maxConnectionsPerUser: env.WS_MAX_CONNECTIONS_PER_USER,
    },
  };
};
