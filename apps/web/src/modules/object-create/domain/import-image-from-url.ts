import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

/** Keep in sync with `apps/ipfs-gateway` `ImageProcessorService` allowed MIME types. */
export const ALLOWED_IMPORT_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/tiff',
]);

/** Same limit as `UPLOAD_IMAGE_MAX_FILE_BYTES` in ipfs-gateway. */
export const IMPORT_IMAGE_MAX_BYTES = 50 * 1024 * 1024;

const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '::1']);

export const IMAGE_IMPORT_MAX_REDIRECTS = 3;

export type ImageImportUrlCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: 'invalid' | 'protocol' | 'host' };

/** Blocks RFC1918, link-local, CGNAT, loopback, and metadata-style addresses. */
export function isPrivateOrRestrictedIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127 || a === 0) {
      return true;
    }
    if (a === 10) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true;
    }
    return false;
  }
  if (isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') {
      return true;
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    if (normalized.startsWith('fe80')) {
      return true;
    }
    if (normalized.startsWith('::ffff:')) {
      return isPrivateOrRestrictedIp(normalized.slice(7));
    }
    return false;
  }
  return false;
}

async function isImageImportHostnameResolvable(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  if (LOCALHOST_NAMES.has(host) || host.endsWith('.localhost')) {
    return false;
  }
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return !isPrivateOrRestrictedIp(hostname);
  }
  try {
    const { address } = await lookup(hostname, { verbatim: true });
    return !isPrivateOrRestrictedIp(address);
  } catch {
    return false;
  }
}

/** HTTP(S) only; blocks loopback, raw IPs, and `.localhost` (SSRF). */
export function isAllowedImageImportUrl(urlString: string): ImageImportUrlCheck {
  const trimmed = urlString.trim();
  if (!trimmed) {
    return { ok: false, reason: 'invalid' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'protocol' };
  }
  const host = parsed.hostname.toLowerCase();
  if (LOCALHOST_NAMES.has(host) || host.endsWith('.localhost')) {
    return { ok: false, reason: 'host' };
  }
  if (isIPv4(parsed.hostname) || isIPv6(parsed.hostname)) {
    if (isPrivateOrRestrictedIp(parsed.hostname)) {
      return { ok: false, reason: 'host' };
    }
    return { ok: true, url: parsed };
  }
  return { ok: true, url: parsed };
}

/** Sync URL shape checks plus DNS resolution guard against private/metadata IPs. */
export async function isAllowedImageImportUrlAsync(
  urlString: string,
): Promise<ImageImportUrlCheck> {
  const sync = isAllowedImageImportUrl(urlString);
  if (!sync.ok) {
    return sync;
  }
  const resolvable = await isImageImportHostnameResolvable(sync.url.hostname);
  if (!resolvable) {
    return { ok: false, reason: 'host' };
  }
  return sync;
}

export function normalizeContentTypeHeader(
  header: string | null | undefined,
): string {
  if (!header) {
    return '';
  }
  return header.split(';')[0]?.trim().toLowerCase() ?? '';
}

/** Magic-byte sniff when the server omits or mislabels Content-Type. */
export function sniffImageMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand.startsWith('avif') || brand.startsWith('avis')) {
      return 'image/avif';
    }
  }
  const le = buffer.toString('ascii', 0, 2);
  if (le === 'II' || le === 'MM') {
    return 'image/tiff';
  }
  return null;
}

export function resolveImageMimeForImport(
  contentTypeHeader: string | null | undefined,
  buffer: Buffer,
): string | null {
  const fromHeader = normalizeContentTypeHeader(contentTypeHeader);
  if (fromHeader && ALLOWED_IMPORT_IMAGE_MIME.has(fromHeader)) {
    return fromHeader;
  }
  const sniffed = sniffImageMimeFromBuffer(buffer);
  if (sniffed && ALLOWED_IMPORT_IMAGE_MIME.has(sniffed)) {
    return sniffed;
  }
  return null;
}
