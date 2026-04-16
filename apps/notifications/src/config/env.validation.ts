import { z } from 'zod';

export const notificationsEnvSchema = z.object({
  PORT: z.coerce.number().optional().default(7200),
  JWT_SECRET: z.string().min(16),
  SUBSCRIPTION_TTL_SECONDS: z.coerce.number().optional().default(300),
  WS_PING_INTERVAL_MS: z.coerce.number().optional().default(30_000),
  WS_PING_TIMEOUT_MS: z.coerce.number().optional().default(10_000),
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
