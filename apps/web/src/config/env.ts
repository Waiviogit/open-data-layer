import 'server-only';

import { z } from 'zod';

import { parseOdlNetwork, resolveOdlCustomJsonId } from './odl-network';

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
  /** Must match chain-indexer `ODL_NETWORK` for the same deployment. */
  ODL_NETWORK: z.enum(['mainnet', 'testnet']).optional().default('mainnet'),
  /**
   * When true, unauthenticated users are redirected to `/sign-in` and cannot browse the site.
   */
  REQUIRE_AUTH: z
    .string()
    .optional()
    .transform((v) => v?.trim().toLowerCase() === 'true'),
  /**
   * Public site origin for browser redirects (Docker/nginx). Falls back to `AUTH_APP_DISPLAY_ORIGIN`.
   */
  WEB_PUBLIC_ORIGIN: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t.replace(/\/$/, '') : undefined;
    }),
});

const parsed = envSchema.parse(process.env);
const odlNetwork = parseOdlNetwork(parsed.ODL_NETWORK);

const authAppDisplayOrigin = process.env.AUTH_APP_DISPLAY_ORIGIN?.trim();
const publicOrigin =
  parsed.WEB_PUBLIC_ORIGIN ??
  (authAppDisplayOrigin ? authAppDisplayOrigin.replace(/\/$/, '') : undefined);

export const env = {
  ...parsed,
  odlNetwork,
  requireAuth: parsed.REQUIRE_AUTH,
  publicOrigin,
  /** Hive `custom_json.id` for server-side ODL envelope builders. */
  odlCustomJsonId: resolveOdlCustomJsonId(odlNetwork),
};
