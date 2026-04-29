/** Hive blockchain permlink max length (STEEMIT_MAX_PERMLINK_LENGTH). */
export const HIVE_PERMLINK_MAX_LENGTH = 255;

/** Slug from title is capped before final length check (legacy Steemit). */
export const HIVE_POST_TITLE_SLUG_MAX = 128;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const DATE_SUFFIX_IN_PARENT_PERMLINK = /-\d{8}t\d{9}z/g;

const MAX_UNIQUE_ATTEMPTS = 8;

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c) {
    throw new Error('Web Crypto API (globalThis.crypto.getRandomValues) is not available');
  }
  return c;
}

function encodeBase58(bytes: Uint8Array): string {
  const zeros = bytes.findIndex((b) => b !== 0);
  const leadingZeros = zeros === -1 ? bytes.length : zeros;
  let num = BigInt(0);
  const slice = zeros === -1 ? new Uint8Array(0) : bytes.subarray(zeros);
  for (const b of slice) {
    num = (num << BigInt(8)) + BigInt(b);
  }
  if (num === BigInt(0) && bytes.length > 0) {
    return '1'.repeat(leadingZeros);
  }
  let out = '';
  const fiftyEight = BigInt(58);
  while (num > BigInt(0)) {
    const rem = Number(num % fiftyEight);
    out = BASE58_ALPHABET[rem] + out;
    num = num / fiftyEight;
  }
  return '1'.repeat(leadingZeros) + out;
}

/**
 * Random base58 string from CSPRNG bytes (Bitcoin-style alphabet, no 0/O/I/l).
 */
export function randomBase58String(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  getCrypto().getRandomValues(bytes);
  return encodeBase58(bytes);
}

/**
 * Lowercase, only `[a-z0-9-]`, collapse repeated hyphens, trim edge hyphens, max length.
 */
export function sanitizeHivePermlink(raw: string): string {
  let s = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length > HIVE_PERMLINK_MAX_LENGTH) {
    s = s.slice(0, HIVE_PERMLINK_MAX_LENGTH);
    s = s.replace(/-+$/g, '');
  }
  return s;
}

/**
 * Strip Hive-style timestamp suffixes from parent permlink (legacy comment threading).
 */
export function stripCommentParentPermlinkSuffix(parentPermlink: string): string {
  return parentPermlink.replace(DATE_SUFFIX_IN_PARENT_PERMLINK, '');
}

function buildReTimestampedPermlink(
  parentAuthor: string,
  parentPermlink: string,
  now: Date,
): string {
  const timeStr = now.toISOString().replace(/[^a-zA-Z0-9]+/g, '');
  const strippedParent = stripCommentParentPermlinkSuffix(parentPermlink);
  let permlink = `re-${parentAuthor}-${strippedParent}-${timeStr}`;
  permlink = sanitizeHivePermlink(permlink);
  if (permlink.length > HIVE_PERMLINK_MAX_LENGTH) {
    permlink = permlink.substring(permlink.length - HIVE_PERMLINK_MAX_LENGTH, permlink.length);
    permlink = sanitizeHivePermlink(permlink);
  }
  return permlink;
}

/**
 * New comment permlink: `re-{parentAuthor}-{parentPermlink}-{isoTime}` (legacy Steemit).
 */
export function createCommentPermlink(
  parentAuthor: string,
  parentPermlink: string,
  now: Date = new Date(),
): string {
  return buildReTimestampedPermlink(parentAuthor, parentPermlink, now);
}

/**
 * Root post with **empty title**: same formula as {@link createCommentPermlink}.
 */
export function createRootPostPermlinkFromParents(
  parentAuthor: string,
  parentPermlink: string,
  now: Date = new Date(),
): string {
  return buildReTimestampedPermlink(parentAuthor, parentPermlink, now);
}

/**
 * ASCII slug from title: NFKC, `[a-z0-9]` only (other chars become `-`), max {@link HIVE_POST_TITLE_SLUG_MAX}.
 * Returns `''` if nothing usable remains.
 */
export function titleToPostSlug(title: string): string {
  const normalized = title.normalize('NFKC').trim().toLowerCase();
  let out = '';
  for (const char of normalized) {
    if (/[a-z0-9]/.test(char)) {
      out += char;
    } else if (/\s/.test(char) || char === '-' || char === '_') {
      out += '-';
    } else {
      out += '-';
    }
  }
  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (out.length > HIVE_POST_TITLE_SLUG_MAX) {
    out = out.slice(0, HIVE_POST_TITLE_SLUG_MAX).replace(/-+$/g, '');
  }
  return out;
}

function slugCoreForRootPost(title: string): string {
  const trimmed = title.trim();
  if (trimmed === '') {
    throw new Error('title is empty; use createRootPostPermlinkFromParents');
  }
  let slug = titleToPostSlug(trimmed);
  if (slug === '') {
    slug = randomBase58String(4);
  }
  return slug;
}

/**
 * Synchronous root post permlink when **title is non-empty** (no chain uniqueness check).
 * Guest: `{base58}-{slug}`; normal: `slug` or `slug` from title/random fallback.
 */
export function createRootPostPermlink(input: {
  title: string;
  author: string;
  isGuest?: boolean;
  now?: Date;
}): string {
  void input.author;
  const slug = slugCoreForRootPost(input.title);
  const candidate = input.isGuest === true ? `${randomBase58String(4)}-${slug}` : slug;
  return sanitizeHivePermlink(candidate);
}

/**
 * Retry with `{base58}-{slug}` until `exists` returns false or attempts exhausted.
 */
export async function createUniqueRootPostPermlink(
  input: { title: string; author: string; isGuest?: boolean; now?: Date },
  deps: {
    exists: (author: string, permlink: string) => Promise<boolean>;
  },
): Promise<string> {
  const author = input.author;
  const slug = slugCoreForRootPost(input.title);
  let candidate =
    input.isGuest === true ? `${randomBase58String(4)}-${slug}` : slug;
  candidate = sanitizeHivePermlink(candidate);

  for (let attempt = 0; attempt < MAX_UNIQUE_ATTEMPTS; attempt++) {
    if (!(await deps.exists(author, candidate))) {
      return candidate;
    }
    candidate = sanitizeHivePermlink(`${randomBase58String(4)}-${slug}`);
  }
  throw new Error('Could not generate a unique permlink');
}
