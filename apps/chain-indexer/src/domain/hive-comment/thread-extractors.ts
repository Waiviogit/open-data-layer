import { OBJECT_PATH_BODY_RE } from './comment-post-object-candidates';
import { parseJsonMetadata } from './json-metadata.util';

const HASHTAG_BODY_RE = /#([\w-]+)/g;
const MENTION_RE = /@([\w.-]+)/g;
const URL_RE = /https?:\/\/\S+/g;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function extractHashtags(body: string): string[] {
  if (!body) {
    return [];
  }
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const bodyRe = new RegExp(HASHTAG_BODY_RE);
  while ((m = bodyRe.exec(body)) !== null) {
    out.push(m[1]);
  }
  const slugRe = new RegExp(OBJECT_PATH_BODY_RE);
  while ((m = slugRe.exec(body)) !== null) {
    if (m[1]) {
      out.push(m[1]);
    }
  }
  return uniqueStrings(out);
}

export function extractHashtagsFromMetadata(jsonMetadata: string): string[] {
  const meta = parseJsonMetadata(jsonMetadata);
  const tags = meta?.tags;
  if (!Array.isArray(tags)) {
    return [];
  }
  const list = tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  return uniqueStrings(list);
}

export function extractMentions(body: string): string[] {
  if (!body) {
    return [];
  }
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE);
  while ((m = re.exec(body)) !== null) {
    out.push(m[1]);
  }
  return uniqueStrings(out);
}

export function extractLinks(body: string): string[] {
  if (!body) {
    return [];
  }
  const m = body.match(URL_RE);
  return m ? uniqueStrings(m) : [];
}

export function extractImages(jsonMetadata: string): string[] {
  const meta = parseJsonMetadata(jsonMetadata);
  if (!meta) {
    return [];
  }
  const image = meta.image;
  if (Array.isArray(image)) {
    return uniqueStrings(image.filter((i): i is string => typeof i === 'string'));
  }
  if (typeof image === 'string' && image) {
    return [image];
  }
  return [];
}

export function detectBulkMessage(jsonMetadata: string): boolean {
  const meta = parseJsonMetadata(jsonMetadata);
  return Boolean(meta && meta.bulkMessage);
}

/**
 * Tickers like $HIVE when symbol appears in `symbolList`.
 */
export function extractCryptoTickers(
  text: string,
  symbolList: readonly string[],
): string[] {
  if (!text || symbolList.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const upperSymbols = symbolList.map((s) => s.toUpperCase());
  for (const sym of upperSymbols) {
    const re = new RegExp(`\\$${escapeRegex(sym)}\\b`, 'g');
    if (re.test(text)) {
      seen.add(sym);
    }
  }
  return [...seen];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
