import 'server-only';

/**
 * Public origin for ipfs-gateway image URLs (`/ipfs-gateway/content/image/:cid`).
 * Read at **request/runtime** from container env — not baked into the web image at build.
 */
export function getIpfsContentBaseUrl(): string {
  return (process.env.IPFS_CONTENT_BASE_URL ?? '').trim().replace(/\/$/, '');
}
