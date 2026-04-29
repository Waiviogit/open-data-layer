/** Sentinel `category_name` row in `object_categories_related` for uncategorized group count. */
export const UNCATEGORIZED_CATEGORY_SENTINEL = '__uncategorized__';

/**
 * Precomputed shop category scopes: book+product vs recipe.
 * `scope_key` for `object_categories_related` is `buildUserScopeKey(account, bucket)`.
 */
export const SHOP_TYPE_BUCKETS: readonly string[][] = [
  ['book', 'product'],
  ['recipe'],
] as const;

/** Builds canonical `scope_key` from account + sorted types (comma-separated). */
export function buildUserScopeKey(account: string, types: readonly string[]): string {
  const sorted = [...types].map((t) => t.trim()).filter(Boolean).sort();
  return `${account.trim()}:${sorted.join(',')}`;
}

/**
 * Parses `scope_key` into account and type list.
 * Legacy keys without `:` are treated as the first bucket (book, product).
 */
export function parseUserScopeKey(scopeKey: string): { account: string; types: string[] } {
  const trimmed = scopeKey.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return { account: trimmed, types: [...SHOP_TYPE_BUCKETS[0]] };
  }
  const account = trimmed.slice(0, colonIdx).trim();
  const rest = trimmed.slice(colonIdx + 1);
  const types = rest
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (types.length === 0) {
    return { account, types: [...SHOP_TYPE_BUCKETS[0]] };
  }
  return { account, types };
}
