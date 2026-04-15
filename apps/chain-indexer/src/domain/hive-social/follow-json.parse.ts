/**
 * Parse Hive custom_json id=follow payload (JSON array).
 * @see tmp/user-social-parsers-spec.md §4
 */

export type FollowBranchPayload = {
  readonly kind: 'follow';
  readonly follower: string;
  readonly following: string;
  readonly what: unknown[];
};

export type ReblogBranchPayload = {
  readonly kind: 'reblog';
  readonly account: string;
  readonly author: string;
  readonly permlink: string;
};

export type ParsedFollowCustomJson = FollowBranchPayload | ReblogBranchPayload;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseCustomJsonInner(raw: unknown): unknown {
  if (typeof raw === 'string') {
    return safeJsonParse(raw);
  }
  return raw;
}

function trimStr(v: unknown): string | null {
  if (typeof v !== 'string') {
    return null;
  }
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** `what[0]` is empty for unfollow/unmute per legacy spec. */
export function firstWhatToken(what: unknown[] | undefined): string | null {
  if (!what || what.length === 0) {
    return null;
  }
  const w0 = what[0];
  if (w0 === undefined || w0 === null) {
    return null;
  }
  if (typeof w0 === 'string') {
    const t = w0.trim();
    return t.length > 0 ? t : null;
  }
  return String(w0);
}

export function parseFollowCustomJsonArray(
  parsed: unknown,
): ParsedFollowCustomJson | null {
  if (!Array.isArray(parsed) || parsed.length < 2) {
    return null;
  }
  const tag = parsed[0];
  const inner = parsed[1];
  if (tag === 'reblog' && inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>;
    const account = trimStr(o['account']);
    const author = trimStr(o['author']);
    const permlink = trimStr(o['permlink']);
    if (!account || !author || !permlink) {
      return null;
    }
    return { kind: 'reblog', account, author, permlink };
  }
  if (tag === 'follow' && inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>;
    const follower = trimStr(o['follower']);
    const following = trimStr(o['following']);
    const whatRaw = o['what'];
    const what = Array.isArray(whatRaw) ? whatRaw : [];
    if (!follower || !following) {
      return null;
    }
    return { kind: 'follow', follower, following, what };
  }
  return null;
}
