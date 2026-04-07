import 'server-only';

import { z } from 'zod';

/**
 * Single source of truth for server-side env vars used by `apps/web`.
 * Parsed at import time; invalid values throw (fail fast).
 */
const envSchema = z.object({
  QUERY_API_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : 'http://localhost:7000')),
  /** auth-api base URL (BFF proxies to this). */
  AUTH_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : 'http://localhost:7100')),
  /**
   * Same secret as auth-api `JWT_SECRET` — used server-side only to verify access cookies.
   */
  AUTH_JWT_SECRET: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      if (!t) {
        return undefined;
      }
      if (t.length < 16) {
        throw new Error(
          'AUTH_JWT_SECRET must be at least 16 characters when set',
        );
      }
      return t;
    }),
  WEB_THEME_SYNC_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export const env = envSchema.parse(process.env);
