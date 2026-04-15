import type { NewPostObject } from '@opden-data-layer/core';
import { MAX_POST_OBJECTS_PER_POST } from '../../constants/post-objects';

const OBJECT_PATH_RE = /\/object\/([a-z0-9._-]+)/gi;

interface MetadataObjectEntry {
  object_id?: unknown;
  /** Legacy Waivio field; treated like `object_id`. */
  author_permlink?: unknown;
  percent?: unknown;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) {
    return v.trim();
  }
  return null;
}

function toPercent(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.round(v);
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

/** Sum of percents must be in [0, 101] when non-empty (per legacy Waivio rule). */
export function validateWobjectPercentSum(objects: NewPostObject[]): boolean {
  if (objects.length === 0) {
    return true;
  }
  let sum = 0;
  for (const o of objects) {
    if (o.percent != null) {
      sum += o.percent;
    }
  }
  return sum >= 0 && sum <= 101;
}

function parseMetadataObjects(raw: unknown): Array<{ object_id: string; percent: number }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: Array<{ object_id: string; percent: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as MetadataObjectEntry;
    const id = toStr(o.object_id) ?? toStr(o.author_permlink);
    const pct = toPercent(o.percent);
    if (!id || pct === null) {
      continue;
    }
    out.push({ object_id: id, percent: pct });
  }
  return out;
}

function parseMetadataTagStrings(metadata: Record<string, unknown> | null): string[] {
  const raw = metadata?.tags;
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue;
    }
    const t = item.trim();
    if (t) {
      ids.push(t);
    }
  }
  return ids;
}

/**
 * Objects from `json_metadata.objects` (manual percents), `json_metadata.tags` (Hive string[] → percent 0),
 * plus `/object/slug` paths in body (percent 0 unless overridden by `objects`). `objects` wins on duplicate ids.
 *
 * @see docs/spec/data-model/post-json-metadata-objects.md
 */
export function parsePostObjectsForInsert(
  metadata: Record<string, unknown> | null,
  body: string,
): NewPostObject[] {
  const byId = new Map<string, number>();

  for (const id of parseMetadataTagStrings(metadata)) {
    byId.set(id, 0);
  }

  let m: RegExpExecArray | null;
  const re = new RegExp(OBJECT_PATH_RE);
  while ((m = re.exec(body)) !== null) {
    const id = m[1];
    if (!id || byId.has(id)) {
      continue;
    }
    byId.set(id, 0);
  }

  for (const { object_id, percent } of parseMetadataObjects(metadata?.objects)) {
    byId.set(object_id, percent);
  }

  const rows = [...byId.entries()].map(([object_id, percent]) => ({
    author: '',
    permlink: '',
    object_id,
    percent,
    object_type: null,
  }));
  return rows.length <= MAX_POST_OBJECTS_PER_POST
    ? rows
    : rows.slice(0, MAX_POST_OBJECTS_PER_POST);
}

/** Sets author/permlink for insert rows (batched per post). */
export function bindPostObjectsToPost(
  objects: NewPostObject[],
  author: string,
  permlink: string,
): NewPostObject[] {
  return objects.map((o) => ({ ...o, author, permlink }));
}
