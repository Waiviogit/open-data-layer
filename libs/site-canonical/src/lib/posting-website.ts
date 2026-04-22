/**
 * Safely read `website` from Hive account `posting_json_metadata` (JSON string or object from API).
 */
export function extractWebsiteFromPostingJson(
  postingJsonMetadata: string | null | undefined,
): string | null {
  if (postingJsonMetadata == null || postingJsonMetadata === '') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(postingJsonMetadata) as unknown;
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const w = (parsed as Record<string, unknown>)['website'];
  if (typeof w !== 'string' || w.trim() === '') {
    return null;
  }
  return w.trim();
}
