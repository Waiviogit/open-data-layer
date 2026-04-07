import { validateAuthApi } from './env.validation';

export default () => {
  const env = validateAuthApi(
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
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    hive: {
      rpcNodes: env.HIVE_RPC_NODES,
    },
    challenge: {
      ttlSeconds: env.CHALLENGE_TTL_SECONDS,
    },
    authAppDisplayOrigin: env.AUTH_APP_DISPLAY_ORIGIN,
    hivesigner: {
      appName: env.HIVESIGNER_APP_NAME,
      clientSecret: env.HIVESIGNER_CLIENT_SECRET,
      callbackUrl: env.HIVESIGNER_CALLBACK_URL,
      scope: env.HIVESIGNER_SCOPE,
      apiUrl: env.HIVESIGNER_API_URL,
    },
  };
};
