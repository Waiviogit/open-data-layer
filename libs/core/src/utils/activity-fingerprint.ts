import {
  ACTIVITY_DEDUP_WINDOW_SEC,
  ACTIVITY_FINGERPRINT_VERSION,
  ACTIVITY_PHASH_MAX_HAMMING,
  ACTIVITY_SIMHASH_MAX_HAMMING,
  ACTIVITY_SIMHASH_MIN_TEXT_LENGTH,
} from '../constants/osl-messaging.constants';

export { ACTIVITY_FINGERPRINT_VERSION };

const FNV_OFFSET_BASIS = BigInt('0xcbf29ce484222325');
const FNV_PRIME = BigInt('0x100000001b3');

export type ActivityFingerprintInput = {
  fingerprintV: number;
  textSimhash: bigint | null;
  imagePhashes: readonly bigint[];
  sourceTimeUnix: number;
};

/**
 * Normalizes original author caption/title for activity fingerprinting (v1).
 * Order is normative — see docs/spec/osl/activity-fingerprint.md.
 */
export function normalizeOriginalText(text: string): string {
  let s = text.normalize('NFKC').toLowerCase();
  s = s.replace(/https?:\/\/\S+/gi, ' ');
  s = s.replace(/@[\w.]+/g, ' ');
  s = s.replace(/#[\w\u00c0-\u024f]+/gi, ' ');
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  return BigInt.asIntN(64, hash);
}

function wordShingles(words: readonly string[]): string[] {
  if (words.length === 0) {
    return [];
  }
  if (words.length < 3) {
    return [...words];
  }
  const out: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) {
    out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return out;
}

function computeSimhashFromNormalized(normalized: string): bigint | null {
  if (normalized.length < ACTIVITY_SIMHASH_MIN_TEXT_LENGTH) {
    return null;
  }
  const words = normalized.split(' ').filter((w) => w.length > 0);
  const shingles = wordShingles(words);
  if (shingles.length === 0) {
    return null;
  }
  const votes = new Array<number>(64).fill(0);
  for (const shingle of shingles) {
    const h = fnv1a64(shingle);
    for (let bit = 0; bit < 64; bit++) {
      const mask = BigInt(1) << BigInt(bit);
      votes[bit] += (h & mask) !== BigInt(0) ? 1 : -1;
    }
  }
  let result = BigInt(0);
  for (let bit = 0; bit < 64; bit++) {
    if (votes[bit] >= 0) {
      result |= BigInt(1) << BigInt(bit);
    }
  }
  return BigInt.asIntN(64, result);
}

export function computeActivityFingerprint(originalText: string): {
  v: number;
  textSimhash: bigint | null;
  normalizedLength: number;
} {
  const normalized = normalizeOriginalText(originalText);
  return {
    v: ACTIVITY_FINGERPRINT_VERSION,
    textSimhash: computeSimhashFromNormalized(normalized),
    normalizedLength: normalized.length,
  };
}

export function hammingDistance64(a: bigint, b: bigint): number {
  let x = BigInt.asUintN(64, a) ^ BigInt.asUintN(64, b);
  let count = 0;
  while (x !== BigInt(0)) {
    count += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return count;
}

export function parsePHashHex(hex: string): bigint | null {
  const trimmed = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(trimmed)) {
    return null;
  }
  return BigInt.asIntN(64, BigInt(`0x${trimmed}`));
}

export function formatPHashHex(value: bigint): string {
  const unsigned = BigInt.asUintN(64, value);
  return unsigned.toString(16).padStart(16, '0');
}

export function isWithinDedupWindow(
  sourceTimeA: number,
  sourceTimeB: number,
  windowSec: number = ACTIVITY_DEDUP_WINDOW_SEC,
): boolean {
  return Math.abs(sourceTimeA - sourceTimeB) <= windowSec;
}

export function isNearDuplicate(
  a: ActivityFingerprintInput,
  b: ActivityFingerprintInput,
): 'simhash' | 'phash' | null {
  if (a.fingerprintV !== b.fingerprintV) {
    return null;
  }
  if (!isWithinDedupWindow(a.sourceTimeUnix, b.sourceTimeUnix)) {
    return null;
  }
  if (
    a.textSimhash != null &&
    b.textSimhash != null &&
    hammingDistance64(a.textSimhash, b.textSimhash) <= ACTIVITY_SIMHASH_MAX_HAMMING
  ) {
    return 'simhash';
  }
  for (const pa of a.imagePhashes) {
    for (const pb of b.imagePhashes) {
      if (hammingDistance64(pa, pb) <= ACTIVITY_PHASH_MAX_HAMMING) {
        return 'phash';
      }
    }
  }
  return null;
}
