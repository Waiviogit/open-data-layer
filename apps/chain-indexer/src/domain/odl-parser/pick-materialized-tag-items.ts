import type { JsonValue } from '@opden-data-layer/core';
import { OBJECT_TYPE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

export type MaterializedTagCategoryItem = {
  category: string;
  value: string;
};

export function getSupposedTagCategoryNames(objectType: string): Set<string> {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return new Set();
  }
  const entry = def.supposed_updates.find(
    (u) => u.update_type === UPDATE_TYPES.TAG_CATEGORY,
  );
  if (!entry) {
    return new Set();
  }
  const names: string[] = [];
  for (const v of entry.values) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length > 0) {
        names.push(trimmed);
      }
    }
  }
  return new Set(names);
}

function parseTagItemJson(
  valueJson: JsonValue | null,
): MaterializedTagCategoryItem | null {
  if (!valueJson || typeof valueJson !== 'object' || Array.isArray(valueJson)) {
    return null;
  }
  const record = valueJson as Record<string, unknown>;
  const category = typeof record.category === 'string' ? record.category.trim() : '';
  const value = typeof record.value === 'string' ? record.value.trim() : '';
  if (!category || !value) {
    return null;
  }
  return { category, value };
}

/**
 * Picks up to `maxPerCategory` distinct tag items per allowed category from a resolved view.
 * `field.values` order (admin → trusted → community by recency/weight) is preserved.
 */
export function pickMaterializedTagItems(
  view: ResolvedObjectView | undefined,
  allowedCategories: Set<string>,
  maxPerCategory: number,
): MaterializedTagCategoryItem[] {
  const field = view?.fields[UPDATE_TYPES.TAG_CATEGORY_ITEM];
  if (!field || allowedCategories.size === 0) {
    return [];
  }

  const byCategory = new Map<string, MaterializedTagCategoryItem[]>();

  for (const row of field.values) {
    const parsed = parseTagItemJson(row.value_json);
    if (!parsed || !allowedCategories.has(parsed.category)) {
      continue;
    }
    let list = byCategory.get(parsed.category);
    if (!list) {
      list = [];
      byCategory.set(parsed.category, list);
    }
    if (list.length >= maxPerCategory) {
      continue;
    }
    if (list.some((item) => item.value === parsed.value)) {
      continue;
    }
    list.push(parsed);
  }

  return [...byCategory.values()].flat();
}
