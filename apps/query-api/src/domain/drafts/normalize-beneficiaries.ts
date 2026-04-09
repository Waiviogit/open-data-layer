import type { HiveBeneficiary } from '@opden-data-layer/core';

/**
 * Expand various legacy shapes to a list of raw items (objects or JSON strings).
 * Hive `posts.beneficiaries` is usually an array of `{ account, weight }`, but
 * some rows are stored as array-like objects `{"0": "...", "1": "..."}` or
 * stringified fragments — never return early with `JSON.stringify(raw)` on those.
 */
function expandBeneficiaryList(raw: unknown): unknown[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return expandBeneficiaryList(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== 'object') {
    return [];
  }

  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) {
    return [];
  }

  const allNumericKeys = keys.every((k) => /^\d+$/.test(k));
  if (allNumericKeys) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => o[k]);
  }

  if ('account' in o || 'weight' in o) {
    return [o];
  }

  return Object.values(o);
}

/**
 * Hive `posts.beneficiaries` is JSONB array of `{ account, weight }`.
 * Normalizes to a plain typed array safe for JSONB insert (no double-encoded strings).
 */
export function normalizeBeneficiariesForDb(raw: unknown): HiveBeneficiary[] {
  const list = expandBeneficiaryList(raw);

  const out: HiveBeneficiary[] = [];
  for (const item of list) {
    if (item === null || item === undefined) {
      continue;
    }
    let obj: unknown = item;
    if (typeof item === 'string') {
      try {
        obj = JSON.parse(item) as unknown;
      } catch {
        continue;
      }
    }
    if (
      obj !== null &&
      typeof obj === 'object' &&
      !Array.isArray(obj) &&
      'account' in (obj as object) &&
      'weight' in (obj as object)
    ) {
      const b = obj as { account: unknown; weight: unknown };
      out.push({
        account: String(b.account),
        weight: Number(b.weight),
      });
    }
  }

  return out;
}
