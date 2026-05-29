import 'server-only';

import { env } from './env';

/**
 * Origin for server-side ipfs-gateway API calls (upload).
 * Uses public {@link env.IPFS_CONTENT_BASE_URL} (nginx in prod) or local dev default.
 */
export function getIpfsGatewayServerBaseUrl(): string {
  return env.IPFS_CONTENT_BASE_URL ?? 'http://localhost:7300';
}
