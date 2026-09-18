import { isSafeHttpUrl } from '@/shared/domain/safe-http-url';

/** Protocol-less host with path, query, or fragment (not a dotted handle like `user.name`). */
const PROTOCOL_LESS_URL_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+[/?#]/;

function resolveStoredUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (isSafeHttpUrl(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    const candidate = `https:${trimmed}`;
    return isSafeHttpUrl(candidate) ? candidate : null;
  }
  if (trimmed.startsWith('www.') || PROTOCOL_LESS_URL_PATTERN.test(trimmed)) {
    const candidate = `https://${trimmed}`;
    return isSafeHttpUrl(candidate) ? candidate : null;
  }
  return null;
}

function buildPlatformLinkHref(kind: string, value: string): string {
  const v = encodeURIComponent(value);
  switch (kind) {
    case 'facebook':
      return `https://www.facebook.com/${v}`;
    case 'twitter':
      return `https://x.com/${v}`;
    case 'youtube':
      return `https://www.youtube.com/@${v}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${v}`;
    case 'reddit':
      return `https://www.reddit.com/user/${v}`;
    case 'linkedin':
      return `https://www.linkedin.com/in/${v}`;
    case 'telegram':
      return `https://t.me/${v}`;
    case 'whatsapp':
      return `https://wa.me/${v}`;
    case 'pinterest':
      return `https://www.pinterest.com/${v}`;
    case 'twitch':
      return `https://www.twitch.tv/${v}`;
    case 'snapchat':
      return `https://www.snapchat.com/add/${v}`;
    case 'instagram':
      return `https://instagram.com/${v}`;
    case 'github':
      return `https://github.com/${v}`;
    case 'hive':
      return `https://peakd.com/@${v}`;
    default:
      return `https://${v}`;
  }
}

/**
 * Resolves left-rail social link `href` from ODL `link` update `{ type, value }`.
 * Full URLs are kept as stored; account handles use legacy platform prefix mapping.
 */
export function resolveSocialLinkHref(kind: string, value: string): string {
  const storedUrl = resolveStoredUrl(value);
  if (storedUrl) {
    return storedUrl;
  }
  return buildPlatformLinkHref(kind, value.trim());
}
