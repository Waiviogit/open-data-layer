import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import type { UpdateDefinition } from '@opden-data-layer/core/update-registry';

export type RefValueKind = 'user_ref' | 'object_ref';

export type RefFieldRow = {
  entryKey: string;
  updateType: string;
  value: unknown;
};

export function isRefValueKind(
  kind: UpdateDefinition['value_kind'] | undefined,
): kind is RefValueKind {
  return kind === 'user_ref' || kind === 'object_ref';
}

export function normalizeRefFieldValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function refValuesEqual(
  valueKind: RefValueKind,
  a: string,
  b: string,
): boolean {
  if (a === b) {
    return true;
  }
  if (valueKind === 'user_ref') {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

/** Values already used by other rows of the same `updateType` (for search exclusion). */
export function excludedRefValuesForEntry(
  rows: readonly RefFieldRow[],
  updateType: string,
  entryKey: string,
): string[] {
  const def = UPDATE_REGISTRY[updateType];
  if (!isRefValueKind(def?.value_kind)) {
    return [];
  }
  const out: string[] = [];
  for (const row of rows) {
    if (row.updateType !== updateType || row.entryKey === entryKey) {
      continue;
    }
    const v = normalizeRefFieldValue(row.value);
    if (v) {
      out.push(v);
    }
  }
  return out;
}

export function isRefValueExcluded(
  valueKind: RefValueKind,
  candidate: unknown,
  excluded: readonly string[],
): boolean {
  const norm = normalizeRefFieldValue(candidate);
  if (!norm || excluded.length === 0) {
    return false;
  }
  return excluded.some((ex) => refValuesEqual(valueKind, norm, ex));
}

/** True when another row of the same update type already has this ref value. */
export function isDuplicateRefValue(
  rows: readonly RefFieldRow[],
  updateType: string,
  entryKey: string,
  value: unknown,
): boolean {
  const def = UPDATE_REGISTRY[updateType];
  if (!isRefValueKind(def?.value_kind)) {
    return false;
  }
  const excluded = excludedRefValuesForEntry(rows, updateType, entryKey);
  return isRefValueExcluded(def.value_kind, value, excluded);
}

/** Update types that have duplicate ref values among filled rows. */
export function findDuplicateRefUpdateTypes(
  fields: readonly RefFieldRow[],
): string[] {
  const dupTypes = new Set<string>();
  for (let i = 0; i < fields.length; i++) {
    const a = fields[i];
    if (!a) {
      continue;
    }
    const defA = UPDATE_REGISTRY[a.updateType];
    if (!isRefValueKind(defA?.value_kind)) {
      continue;
    }
    const va = normalizeRefFieldValue(a.value);
    if (!va) {
      continue;
    }
    for (let j = i + 1; j < fields.length; j++) {
      const b = fields[j];
      if (!b || b.updateType !== a.updateType) {
        continue;
      }
      const vb = normalizeRefFieldValue(b.value);
      if (vb && refValuesEqual(defA.value_kind, va, vb)) {
        dupTypes.add(a.updateType);
      }
    }
  }
  return [...dupTypes];
}
