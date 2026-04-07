import { z } from 'zod';

export const authApiConfigSchema = z.object({
  PORT: z.coerce.number().optional().default(7100),
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().optional().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default('7d'),
  HIVE_RPC_NODES: z
    .string()
    .optional()
    .default('https://api.hive.blog')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  CHALLENGE_TTL_SECONDS: z.coerce.number().optional().default(300),
  /** Shown inside the sign-in message (e.g. your app hostname). */
  AUTH_APP_DISPLAY_ORIGIN: z.string().min(1).optional().default('https://example.com'),
  HIVESIGNER_APP_NAME: z.string().optional().default(''),
  HIVESIGNER_CLIENT_SECRET: z.string().optional().default(''),
  HIVESIGNER_CALLBACK_URL: z.string().url().optional().or(z.literal('')).default(''),
  HIVESIGNER_SCOPE: z.string().optional().default('login'),
  HIVESIGNER_API_URL: z
    .string()
    .url()
    .optional()
    .default('https://hivesigner.com'),
});

export type AuthApiEnv = z.infer<typeof authApiConfigSchema>;

export function validateAuthApi(
  config: Record<string, unknown>,
): AuthApiEnv {
  const result = authApiConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
