import { OBJECT_TYPE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';

/** Category names from `supposed_updates` TAG_CATEGORY for an object type (registry order). */
export function getTagCategoryOrderForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  const entry = def.supposed_updates.find((u) => u.update_type === UPDATE_TYPES.TAG_CATEGORY);
  const raw = entry?.values ?? [];
  return raw.filter((v): v is string => typeof v === 'string');
}
