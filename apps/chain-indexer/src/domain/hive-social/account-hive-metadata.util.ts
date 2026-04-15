/**
 * Derive display alias and profile image from Hive account metadata strings.
 * Prefer `posting_json_metadata`, then `json_metadata` (matches on-chain `account_update` flow).
 */

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function profileFromParsed(parsed: Record<string, unknown>): {
  alias: string;
  profile_image: string | null;
} {
  const profile = parsed['profile'];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { alias: '', profile_image: null };
  }
  const p = profile as Record<string, unknown>;
  const name = typeof p['name'] === 'string' ? p['name'] : '';
  const img = typeof p['profile_image'] === 'string' ? p['profile_image'] : null;
  return { alias: name, profile_image: img };
}

export function profileAliasAndImageFromHiveStrings(
  postingJsonMetadata: string,
  jsonMetadata: string,
): { alias: string; profile_image: string | null } {
  const pjm = postingJsonMetadata.trim();
  if (pjm) {
    const parsed = parseJsonObject(pjm);
    if (parsed) {
      return profileFromParsed(parsed);
    }
  }
  const jm = jsonMetadata.trim();
  if (jm) {
    const parsed = parseJsonObject(jm);
    if (parsed) {
      return profileFromParsed(parsed);
    }
  }
  return { alias: '', profile_image: null };
}
