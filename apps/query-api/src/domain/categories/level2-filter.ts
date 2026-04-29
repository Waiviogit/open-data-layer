import {
  GROUP_KEY_OVERLAP_TOLERANCE,
  LEVEL2_MAX_PCT,
  LEVEL2_MIN_PCT,
  LEVEL2_MIN_SUB_OBJECTS,
} from './category-navigation.constants';
import type { CategoryNavigationRow } from './category-navigation.types';

function intersectionKeys(a: string[], b: string[]): string[] {
  const bs = new Set(b);
  return a.filter((x) => bs.has(x));
}

function overlapsNearDuplicate(aKeys: string[], bKeys: string[]): boolean {
  const intersection = intersectionKeys(aKeys, bKeys);
  const dropFromA = aKeys.length - intersection.length;
  const dropFromB = bKeys.length - intersection.length;
  return (
    dropFromA < GROUP_KEY_OVERLAP_TOLERANCE && dropFromB < GROUP_KEY_OVERLAP_TOLERANCE
  );
}

/** Level ≥2 navigation under `name` using `related_names` ancestry. */
export function filterSubDepartments(params: {
  allRows: CategoryNavigationRow[];
  path: string[];
  name: string;
  excluded: string[];
}): CategoryNavigationRow[] {
  const { allRows, path, name, excluded } = params;
  const ancestry = [...path, name];

  let candidates = allRows.filter(
    (d) =>
      d.category_name !== name &&
      !excluded.includes(d.category_name) &&
      ancestry.every((a) => d.related_names.includes(a)),
  );

  const total = candidates.reduce((s, d) => s + d.objects_count, 0);
  if (total === 0 || candidates.length === 0) {
    return [];
  }

  candidates = candidates.filter((d) => {
    const pct = d.objects_count / total;
    return pct > LEVEL2_MIN_PCT && pct < LEVEL2_MAX_PCT && d.objects_count > LEVEL2_MIN_SUB_OBJECTS;
  });

  candidates.sort((a, b) => b.objects_count - a.objects_count);
  const kept: CategoryNavigationRow[] = [];

  for (const cat of candidates) {
    const nearDup = kept.some((k) =>
      overlapsNearDuplicate(cat.group_keys, k.group_keys),
    );
    if (!nearDup) {
      kept.push(cat);
    }
  }

  return kept;
}

/** True iff some category row exists deeper under `lineage` (every segment ∈ `related_names`). */
export function hasDescendantBeyondLineage(
  allRows: CategoryNavigationRow[],
  lineage: string[],
): boolean {
  if (lineage.length === 0) {
    return false;
  }
  const leaf = lineage[lineage.length - 1];
  return allRows.some((row) => {
    if (row.category_name === leaf) {
      return false;
    }
    return lineage.every((a) => row.related_names.includes(a));
  });
}
