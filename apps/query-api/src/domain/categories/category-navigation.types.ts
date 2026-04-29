import type { ObjectCategoriesRelatedRow } from '@opden-data-layer/core';

/** Narrow row shape for filtering (counts as numbers). */
export interface CategoryNavigationRow {
  category_name: string;
  objects_count: number;
  group_keys: string[];
  related_names: string[];
}

export function toNavigationRow(row: ObjectCategoriesRelatedRow): CategoryNavigationRow {
  const oc =
    typeof row.objects_count === 'bigint' ? Number(row.objects_count) : row.objects_count;
  return {
    category_name: row.category_name,
    objects_count: Number(oc),
    group_keys: row.group_keys ?? [],
    related_names: row.related_names ?? [],
  };
}
