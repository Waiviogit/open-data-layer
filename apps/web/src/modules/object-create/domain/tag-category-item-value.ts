import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { FieldEntry } from './object-create.types';

export function tagCategoryItemParts(
  raw: unknown,
): { category: string; value: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { category: '', value: '' };
  }
  const o = raw as Record<string, unknown>;
  return {
    category: typeof o.category === 'string' ? o.category.trim() : '',
    value: typeof o.value === 'string' ? o.value.trim() : '',
  };
}

export function isTagCategoryItemFilled(raw: unknown): boolean {
  return tagCategoryItemParts(raw).value.length > 0;
}

export function isTagCategoryItemField(entry: FieldEntry): boolean {
  return entry.updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM;
}
