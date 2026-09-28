const LEGACY_UPDATE_TX_PREFIX = 'legacy_';
const HIVE_ACCOUNT_PATTERN = /^[a-z0-9.-]{3,16}$/;

export type LegacyUpdatePostRef = {
  author: string;
  permlink: string;
};

/** `legacy_{author}_{permlink}` from the Mongo object migration. Author has no `_`. */
export function parseLegacyUpdatePostRef(transactionId: string): LegacyUpdatePostRef | null {
  const id = transactionId.trim();
  if (!id.startsWith(LEGACY_UPDATE_TX_PREFIX)) {
    return null;
  }
  const rest = id.slice(LEGACY_UPDATE_TX_PREFIX.length);
  const sep = rest.indexOf('_');
  if (sep <= 0 || sep >= rest.length - 1) {
    return null;
  }
  const author = rest.slice(0, sep);
  const permlink = rest.slice(sep + 1);
  if (!HIVE_ACCOUNT_PATTERN.test(author)) {
    return null;
  }
  return { author, permlink };
}

/**
 * Explorer href for an update `transaction_id`.
 * Legacy ids open `/{origin}/@{author}/{permlink}` on the same host as `baseUrl`.
 * Anything else, including an unparseable `legacy_*`, opens `{baseUrl}/{id}`.
 */
export function hiveUpdateExplorerHref(baseUrl: string, transactionId: string): string | null {
  const id = transactionId.trim();
  if (!id) {
    return null;
  }
  const base = baseUrl.trim().replace(/\/$/, '');
  const legacy = parseLegacyUpdatePostRef(id);
  if (legacy) {
    const origin = explorerOrigin(base);
    if (origin) {
      return `${origin}/@${encodeURIComponent(legacy.author)}/${encodeURIComponent(legacy.permlink)}`;
    }
  }
  return `${base}/${encodeURIComponent(id)}`;
}

function explorerOrigin(base: string): string | null {
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}
