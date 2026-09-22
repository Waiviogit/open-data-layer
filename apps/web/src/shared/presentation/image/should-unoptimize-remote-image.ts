/**
 * Hosts where the Next.js image optimizer's server-side fetch often fails
 * (DNS, flaky CDN, or offline dev). Using `unoptimized` avoids throwing during
 * SSR/optimization; use `onError` on the Image for client-side fallbacks.
 */
const HOSTS_SKIP_IMAGE_OPTIMIZATION = new Set([
  'img.3speakcontent.co',
  'steemitimages.com',
  'cdn.steemitimages.com',
  // Next optimizer intermittently 500s on Amazon product CDN; load directly.
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images-eu.ssl-images-amazon.com',
]);

const IPFS_GATEWAY_IMAGE_PATH = '/ipfs-gateway/content/image/';

export function shouldUnoptimizeRemoteImage(src: string): boolean {
  if (!src || src.startsWith('/') || src.startsWith('data:')) {
    return false;
  }
  // First-party gateway bytes. Next's optimizer fetch often fails; onError then
  // swaps UserAvatar onto the Hive CDN, which does not have this image.
  if (src.includes(IPFS_GATEWAY_IMAGE_PATH)) {
    return true;
  }
  try {
    const hostname = new URL(src).hostname.toLowerCase();
    return HOSTS_SKIP_IMAGE_OPTIMIZATION.has(hostname);
  } catch {
    return false;
  }
}
