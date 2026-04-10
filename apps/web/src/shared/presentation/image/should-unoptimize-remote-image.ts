/**
 * Hosts where the Next.js image optimizer's server-side fetch often fails
 * (DNS, flaky CDN, or offline dev). Using `unoptimized` avoids throwing during
 * SSR/optimization; use `onError` on the Image for client-side fallbacks.
 */
const HOSTS_SKIP_IMAGE_OPTIMIZATION = new Set(['img.3speakcontent.co']);

export function shouldUnoptimizeRemoteImage(src: string): boolean {
  if (!src || src.startsWith('/') || src.startsWith('data:')) {
    return false;
  }
  try {
    const hostname = new URL(src).hostname.toLowerCase();
    return HOSTS_SKIP_IMAGE_OPTIMIZATION.has(hostname);
  } catch {
    return false;
  }
}
