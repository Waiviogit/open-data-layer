function tryParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

export function isNsfwPost(jsonMetadata: string, category: string | null): boolean {
  if (category?.toLowerCase() === 'nsfw') {
    return true;
  }
  const parsed = tryParseJson(jsonMetadata);
  if (typeof parsed !== 'object' || parsed === null) {
    return false;
  }
  const tags = (parsed as Record<string, unknown>).tags;
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.some((t) => typeof t === 'string' && t.toLowerCase() === 'nsfw');
}
