/**
 * Prefix range upper bound for btree `name >= prefix AND name < upper` on `accounts_current.name`.
 * ASCII increment on last code unit (sufficient for Hive account names).
 */
export function prefixUpperBound(prefix: string): string {
  if (prefix.length === 0) {
    return prefix;
  }
  const last = prefix.charCodeAt(prefix.length - 1);
  if (last >= 0xffff) {
    return `${prefix}\uffff`;
  }
  return prefix.slice(0, -1) + String.fromCharCode(last + 1);
}

/** Enable expensive `object_id ILIKE '%q%'` only for id-shaped queries. */
export function shouldSearchObjectIdSubstring(q: string): boolean {
  const t = q.trim();
  return t.length >= 8 && t.includes('-');
}
