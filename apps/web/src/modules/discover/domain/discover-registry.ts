import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

/** Object types shown in discover sidebar (registry keys, sorted). */
export function listDiscoverObjectTypes(): string[] {
  return Object.keys(OBJECT_TYPE_REGISTRY).sort((a, b) => a.localeCompare(b));
}

/** Whether object type has TAG_CATEGORY in supposed_updates (right filter column). */
export function objectTypeHasTagCategoryFilters(objectType: string): boolean {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return false;
  }
  return def.supposed_updates.some((u) => u.update_type === UPDATE_TYPES.TAG_CATEGORY);
}

/** Category names from supposed_updates for an object type. */
export function getTagCategoryNamesForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  const entry = def.supposed_updates.find((u) => u.update_type === UPDATE_TYPES.TAG_CATEGORY);
  const raw = entry?.values ?? [];
  return raw.filter((v): v is string => typeof v === 'string');
}
