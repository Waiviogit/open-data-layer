import type { JsonValue } from '@opden-data-layer/core';

/** Maps chain `posts.json_metadata` text into JSONB for drafts. */
export function parsePostJsonMetadataString(text: string): JsonValue {
  const t = text.trim();
  if (!t) {
    return {};
  }
  try {
    const v: unknown = JSON.parse(t);
    if (v === null || typeof v !== 'object') {
      return {};
    }
    return v as JsonValue;
  } catch {
    return {};
  }
}
