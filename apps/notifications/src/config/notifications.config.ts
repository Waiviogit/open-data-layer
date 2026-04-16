import { validateNotificationsEnv } from './env.validation';

export default () => {
  const env = validateNotificationsEnv(
    process.env as unknown as Record<string, unknown>,
  );
  return {
    port: env.PORT,
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
    },
  };
};
