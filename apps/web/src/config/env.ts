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
  WEB_THEME_SYNC_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export const env = envSchema.parse(process.env);
