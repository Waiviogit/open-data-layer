import 'server-only';

import type { CategoryNavData } from '../../domain/types/category-nav';
import { queryApiFetch } from './query-api.client';

export type GetCategoryNavOptions = {
  /** Parent department (drill-down). */
  name?: string;
  /** Ancestors before `name`. */
  path?: string[];
};

function buildCategoriesSearchParams(
  types: readonly string[],
  options?: GetCategoryNavOptions,
): string {
  const sp = new URLSearchParams();
  for (const t of types) {
    sp.append('types', t);
  }
  const parent = options?.name?.trim();
  if (parent && parent.length > 0) {
    sp.set('name', parent);
  }
  for (const segment of options?.path ?? []) {
    if (segment.trim().length > 0) {
      sp.append('path', segment);
    }
  }
  const q = sp.toString();
  return q.length > 0 ? `?${q}` : '';
}

/**
 * Fetches shop/recipe category tree slice from query-api.
 */
export async function getCategoryNav(
  username: string,
  types: readonly string[],
  options?: GetCategoryNavOptions,
): Promise<CategoryNavData | null> {
  const name = username.trim();
  if (name.length === 0) {
    return null;
  }
  const qs = buildCategoriesSearchParams(types, options);
  const path = `/query/v1/users/${encodeURIComponent(name)}/categories${qs}`;
  return queryApiFetch<CategoryNavData>(path);
}
