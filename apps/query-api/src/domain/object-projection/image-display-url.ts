import type { ResolvedUpdate } from '@opden-data-layer/objects-domain';

/** Same pattern as ipfs-client: `{gateway}/ipfs/{cid}`. */
export function ipfsGatewayUrlForCid(gatewayBaseUrl: string, cid: string): string {
  const base = gatewayBaseUrl.replace(/\/+$/, '');
  return `${base}/ipfs/${cid}`;
}

/** Single resolved row: JSON `{ url }` or `{ cid }`, or legacy `value_text` URL. */
export function pickSingleImageDisplayUrlFromResolvedUpdate(
  row: ResolvedUpdate,
  ipfsGatewayBaseUrl: string,
): string | null {
  const j = row?.value_json;
  if (j != null && typeof j === 'object' && !Array.isArray(j)) {
    const o = j as Record<string, unknown>;
    const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
    if (url) {
      return url;
    }
    const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
    if (cid) {
      return ipfsGatewayUrlForCid(ipfsGatewayBaseUrl, cid);
    }
  }
  const fallback = row?.value_text;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}
