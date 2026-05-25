import { z } from 'zod';

import {
  DEFAULT_AUTH_APP_DISPLAY_ORIGIN,
  DEFAULT_HIVESIGNER_API_URL,
  DEFAULT_HIVESIGNER_APP_NAME,
  DEFAULT_HIVESIGNER_CALLBACK_URL,
  DEFAULT_HIVESIGNER_SCOPE,
} from '../constants/hivesigner-defaults';

function nonEmptyOr<T extends string>(fallback: T) {
  return z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : fallback;
    });
}

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
  AUTH_APP_DISPLAY_ORIGIN: nonEmptyOr(DEFAULT_AUTH_APP_DISPLAY_ORIGIN),
  HIVESIGNER_APP_NAME: nonEmptyOr(DEFAULT_HIVESIGNER_APP_NAME),
  HIVESIGNER_CLIENT_SECRET: z.string().optional().default(''),
  HIVESIGNER_CALLBACK_URL: nonEmptyOr(DEFAULT_HIVESIGNER_CALLBACK_URL).pipe(
    z.string().url(),
  ),
  HIVESIGNER_SCOPE: nonEmptyOr(DEFAULT_HIVESIGNER_SCOPE),
  HIVESIGNER_API_URL: nonEmptyOr(DEFAULT_HIVESIGNER_API_URL).pipe(z.string().url()),
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
