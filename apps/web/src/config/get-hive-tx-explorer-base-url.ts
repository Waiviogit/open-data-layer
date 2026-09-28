import 'server-only';

import { env } from './env';

/**
 * Prefix for Hive transaction explorer links (`{base}/{transactionId}`).
 * Read at request/runtime from container env — not baked into the web image at build.
 */
export function getHiveTxExplorerBaseUrl(): string {
  return env.HIVE_TX_EXPLORER_BASE_URL;
}
