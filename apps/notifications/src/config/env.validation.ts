import { z } from 'zod';

export const notificationsEnvSchema = z.object({
  PORT: z.coerce.number().optional().default(7200),
  JWT_SECRET: z.string().min(16),
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
  SUBSCRIPTION_TTL_SECONDS: z.coerce.number().optional().default(300),
  WS_PING_INTERVAL_MS: z.coerce.number().optional().default(30_000),
  WS_PING_TIMEOUT_MS: z.coerce.number().optional().default(10_000),
  WS_MAX_CONNECTIONS_PER_USER: z.coerce.number().int().min(1).optional().default(5),
});

export type NotificationsEnv = z.infer<typeof notificationsEnvSchema>;

export function validateNotificationsEnv(
  config: Record<string, unknown>,
): NotificationsEnv {
  const result = notificationsEnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
