/** `{contentBase}/ipfs-gateway/content/image/{cid}` */
export function imageContentUrlForCid(contentBaseUrl: string, cid: string): string {
  const base = contentBaseUrl.replace(/\/+$/, '');
  return `${base}/ipfs-gateway/content/image/${cid}`;
}

const CONTENT_GATEWAY_IMAGE_PATH =
  /\/ipfs-gateway\/content\/image\/([^/?#\s]+)/i;

/** CID from our content-gateway display URL (any public origin). */
export function extractCidFromContentGatewayUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(CONTENT_GATEWAY_IMAGE_PATH);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
