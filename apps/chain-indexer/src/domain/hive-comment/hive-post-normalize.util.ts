import type { HiveBeneficiary, NewPost } from '@opden-data-layer/core';

/**
 * Hive sometimes returns `json_metadata` as an object; DB column is TEXT storing JSON text.
 * Invalid JSON strings are replaced with a minimal valid object.
 * NUL bytes are stripped (PostgreSQL JSON/JSONB rejects them in some cases).
 *
 * When the string parses as JSON, we re-serialize with `JSON.stringify` so the stored text
 * matches what PostgreSQL accepts for implicit JSON/JSONB casts (stricter than V8 in edge cases).
 */
export function normalizeHiveJsonMetadataForStorage(raw: unknown): string {
  if (raw === undefined || raw === null) {
    return '{}';
  }
  if (typeof raw === 'string') {
    const t = raw.trim().replace(/\u0000/g, '');
    if (t === '') {
      return '{}';
    }
    try {
      const parsed: unknown = JSON.parse(t);
      return safeJsonStringifyForPostgres(parsed);
    } catch {
      return JSON.stringify({ _unparsed: t.slice(0, 2048) });
    }
  }
  try {
    return safeJsonStringifyForPostgres(raw);
  } catch {
    return '{}';
  }
}

function safeJsonStringifyForPostgres(value: unknown): string {
  try {
    return JSON.stringify(value).replace(/\u0000/g, '');
  } catch {
    return '{}';
  }
}

/**
 * `posts.beneficiaries` is JSONB. RPC may return an array, a JSON string, tuple pairs,
 * or malformed data. Values must round-trip through JSON for PostgreSQL.
 */
export function normalizeHiveBeneficiariesForStorage(raw: unknown): HiveBeneficiary[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw.replace(/\u0000/g, '')) as unknown;
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  const out: HiveBeneficiary[] = [];
  for (const item of items) {
    let account = '';
    let weight = 0;

    if (Array.isArray(item) && item.length >= 2) {
      account = String(item[0] ?? '').replace(/\u0000/g, '');
      const w = item[1];
      if (typeof w === 'number' && Number.isFinite(w)) {
        weight = Math.trunc(w);
      } else if (typeof w === 'string' && w.trim() !== '') {
        const n = Number(w);
        if (Number.isFinite(n)) {
          weight = Math.trunc(n);
        }
      }
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const rec = item as Record<string, unknown>;
      account = String(rec.account ?? '').replace(/\u0000/g, '');
      const w = rec.weight;
      if (typeof w === 'number' && Number.isFinite(w)) {
        weight = Math.trunc(w);
      } else if (typeof w === 'string' && w.trim() !== '') {
        const n = Number(w);
        if (Number.isFinite(n)) {
          weight = Math.trunc(n);
        }
      }
    } else {
      continue;
    }

    if (account) {
      const w = Number.isFinite(weight) ? Math.trunc(weight) : 0;
      out.push({ account, weight: w });
    }
  }
  try {
    const serialized = JSON.stringify(out);
    JSON.parse(serialized);
    return JSON.parse(serialized) as HiveBeneficiary[];
  } catch {
    return [];
  }
}

/**
 * Re-parse + stringify so the stored document is always valid JSON text (belt-and-suspenders).
 * Covers any edge case where normalization still produced a string Postgres would reject as json/jsonb.
 */
function roundTripJsonText(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return '{}';
  }
}

/** Last line of defense before INSERT/UPDATE `posts` (any code path). */
export function sanitizePostRowJsonColumnsForDatabase(row: NewPost): NewPost {
  const meta = normalizeHiveJsonMetadataForStorage(row.json_metadata as unknown);
  const ben = normalizeHiveBeneficiariesForStorage(row.beneficiaries as unknown);
  return {
    ...row,
    json_metadata: roundTripJsonText(meta),
    beneficiaries: ben,
  };
}
