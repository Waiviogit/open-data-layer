import type { DiscoverTagCategoryRow } from '../../repositories/discover.repository';
import type { DiscoverTagCategoriesResponseDto } from './discover.types';

/**
 * Groups flat tag rows into sections, ordering categories by registry `supposed_updates`.
 */
export function groupDiscoverTagCategories(
  rows: DiscoverTagCategoryRow[],
  categoryOrder: string[],
): DiscoverTagCategoriesResponseDto {
  const byCategory = new Map<string, { value: string; count: number }[]>();

  for (const row of rows) {
    const cat = row.category?.trim();
    const val = row.tag_value?.trim();
    if (!cat || !val) {
      continue;
    }
    const list = byCategory.get(cat) ?? [];
    list.push({ value: val, count: row.object_count });
    byCategory.set(cat, list);
  }

  const orderedNames =
    categoryOrder.length > 0
      ? [
          ...categoryOrder.filter((c) => byCategory.has(c)),
          ...[...byCategory.keys()].filter((c) => !categoryOrder.includes(c)).sort(),
        ]
      : [...byCategory.keys()].sort();

  const categories = orderedNames.map((category) => ({
    category,
    items: (byCategory.get(category) ?? []).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  }));

  return { categories };
}
