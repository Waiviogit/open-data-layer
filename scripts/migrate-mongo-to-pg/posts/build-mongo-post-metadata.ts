import type { MongoPost, MongoPostWobject } from './types';

function parseJsonMetadataObject(
  raw: string | undefined,
): Record<string, unknown> | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const o = JSON.parse(raw) as unknown;
    if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
      return o as Record<string, unknown>;
    }
  } catch {
    /* invalid */
  }
  return null;
}

/**
 * Builds a metadata object compatible with chain-indexer `parsePostObjectsForInsert`.
 * Prefers top-level `objects` / `tags`; falls back to legacy `wobjects` and `json_metadata` strings.
 */
export function buildMongoPostMetadataRecord(doc: MongoPost): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};
  const jm = parseJsonMetadataObject(doc.json_metadata);

  if (Array.isArray(doc.objects) && doc.objects.length > 0) {
    meta.objects = doc.objects;
  } else if (Array.isArray(doc.wobjects) && doc.wobjects.length > 0) {
    const mapped = doc.wobjects
      .map((w: MongoPostWobject) => ({
        object_id: w.author_permlink?.trim(),
        percent: w.percent,
      }))
      .filter((x) => x.object_id);
    if (mapped.length > 0) {
      meta.objects = mapped;
    }
  } else if (jm) {
    const nested = jm['objects'];
    if (Array.isArray(nested) && nested.length > 0) {
      meta.objects = nested;
    }
  }

  const tagStrings: string[] = [];
  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (typeof t === 'string' && t.trim()) {
        tagStrings.push(t.trim());
      }
    }
  }
  if (tagStrings.length === 0 && jm) {
    const nested = jm['tags'];
    if (Array.isArray(nested)) {
      for (const t of nested) {
        if (typeof t === 'string' && t.trim()) {
          tagStrings.push(t.trim());
        }
      }
    }
  }
  if (tagStrings.length > 0) {
    meta.tags = tagStrings;
  }

  if (Object.keys(meta).length === 0) {
    return null;
  }
  return meta;
}

export function objectTypeByIdFromLegacyWobjects(
  doc: MongoPost,
): Map<string, string | null> {
  const m = new Map<string, string | null>();
  for (const w of doc.wobjects ?? []) {
    const id = w.author_permlink?.trim();
    if (!id) {
      continue;
    }
    m.set(id, w.object_type?.trim() ?? null);
  }
  return m;
}
