import 'server-only';

import { z } from 'zod';

import {
  parseOdlNetwork,
  resolveOblCustomJsonId,
  resolveOdlCustomJsonId,
  resolveOslCustomJsonId,
} from './odl-network';
import { DEFAULT_HAS_WS_URL } from './has.constants';
import { DEFAULT_HIVE_TX_EXPLORER_BASE_URL } from './hive-tx-explorer.constants';

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
   * Public origin for ipfs-gateway (content URLs and server-side uploads via nginx).
   */
  IPFS_CONTENT_BASE_URL: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t.replace(/\/$/, '') : undefined;
    }),
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
  /** HiveAuth (HAS) WebSocket server for Keychain mobile login and broadcast. */
  HAS_WS_URL: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t || DEFAULT_HAS_WS_URL;
    }),
  /** Application name sent to HiveAuth PKSA during authentication. */
  HAS_APP_NAME: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t || 'Waivio';
    }),
  /**
   * Prefix for Hive tx links on update cards (`{base}/{transactionId}`).
   * Domain plus path; trailing slash is stripped.
   */
  HIVE_TX_EXPLORER_BASE_URL: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim().replace(/\/$/, '');
      return t || DEFAULT_HIVE_TX_EXPLORER_BASE_URL;
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
  hasWsUrl: parsed.HAS_WS_URL,
  hasAppName: parsed.HAS_APP_NAME,
  /** Hive `custom_json.id` for server-side ODL envelope builders. */
  odlCustomJsonId: resolveOdlCustomJsonId(odlNetwork),
  /** Hive `custom_json.id` for server-side OBL envelope builders. */
  oblCustomJsonId: resolveOblCustomJsonId(odlNetwork),
  oslCustomJsonId: resolveOslCustomJsonId(odlNetwork),
};
