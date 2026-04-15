/**
 * Lenient JSON parse for Hive json_metadata string.
 * Returns null if missing, empty after trim, or invalid JSON.
 */
export function parseJsonMetadata(
  jsonMetadata: string | undefined | null,
): Record<string, unknown> | null {
  if (jsonMetadata === undefined || jsonMetadata === null) {
    return null;
  }
  const trimmed = jsonMetadata.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** True when parsed metadata should trigger root post path (object is truthy). */
export function isTruthyMetadata(
  metadata: Record<string, unknown> | null,
): metadata is Record<string, unknown> {
  return metadata !== null;
}
