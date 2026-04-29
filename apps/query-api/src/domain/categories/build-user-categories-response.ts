import { UNCATEGORIZED_CATEGORY_SENTINEL, type ObjectCategoriesRelatedRow } from '@opden-data-layer/core';
import { filterRootDepartments } from './level1-filter';
import { filterSubDepartments, hasDescendantBeyondLineage } from './level2-filter';
import type { UserCategoriesQuery, UserCategoriesResponse } from './categories-query.schema';
import { toNavigationRow } from './category-navigation.types';

/**
 * Builds the same payload as {@link GetUserCategoriesEndpoint} from pre-fetched related rows.
 * Used by shop sections pagination so ordering matches sidebar navigation.
 */
export function buildUserCategoriesResponse(
  rows: ObjectCategoriesRelatedRow[],
  query: UserCategoriesQuery,
): UserCategoriesResponse {
  if (rows.length === 0) {
    return { items: [], uncategorized_count: 0, show_other: false };
  }

  const uncategorizedRow = rows.find((r) => r.category_name === UNCATEGORIZED_CATEGORY_SENTINEL);
  const uncategorizedCountRaw = uncategorizedRow?.objects_count ?? 0;
  const uncategorized_count =
    typeof uncategorizedCountRaw === 'bigint'
      ? Number(uncategorizedCountRaw)
      : Number(uncategorizedCountRaw);

  const navRows = rows
    .filter((r) => r.category_name !== UNCATEGORIZED_CATEGORY_SENTINEL)
    .map(toNavigationRow);

  const nameSegment = query.name?.trim();

  if (!nameSegment || nameSegment.length === 0) {
    const { items: rootRows, show_other } = filterRootDepartments(navRows);
    const items = rootRows.map((cat) => ({
      name: cat.category_name,
      objects_count: cat.objects_count,
      has_children: hasDescendantBeyondLineage(navRows, [cat.category_name]),
    }));

    return { items, uncategorized_count, show_other };
  }

  const path = query.path ?? [];
  const excluded = query.excluded ?? [];

  const subRows = filterSubDepartments({
    allRows: navRows,
    path,
    name: nameSegment,
    excluded,
  });

  const lineagePrefix = [...path, nameSegment];
  const items = subRows.map((cat) => ({
    name: cat.category_name,
    objects_count: cat.objects_count,
    has_children: hasDescendantBeyondLineage(navRows, [...lineagePrefix, cat.category_name]),
  }));

  return { items, uncategorized_count: 0, show_other: false };
}
