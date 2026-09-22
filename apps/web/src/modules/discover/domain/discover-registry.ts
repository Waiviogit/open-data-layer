import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

/** Implicit type for bare `/discover` when no remembered cookie exists. */
export const DEFAULT_DISCOVER_OBJECT_TYPE = 'product';

/** Curated Popular order for the desktop discover sidebar (not the object-create group). */
export const DISCOVER_POPULAR_OBJECT_TYPES = [
  'product',
  'business',
  'restaurant',
  'person',
  'book',
] as const;

/** Object types shown in discover sidebar (registry keys, sorted). */
export function listDiscoverObjectTypes(): string[] {
  return Object.keys(OBJECT_TYPE_REGISTRY).sort((a, b) => a.localeCompare(b));
}

/** Popular types that still exist in the registry, in sidebar order. */
export function listDiscoverPopularObjectTypes(): string[] {
  return DISCOVER_POPULAR_OBJECT_TYPES.filter((type) => type in OBJECT_TYPE_REGISTRY);
}

/** Label/key match used by the desktop sidebar and mobile type sheet search. */
export function matchesDiscoverTypeSearch(type: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const label = type.replace(/_/g, ' ').toLowerCase();
  return type.toLowerCase().includes(needle) || label.includes(needle);
}

/** Whether object type supports geo/map search (registry declares UPDATE_TYPES.GEO). */
export function objectTypeSupportsGeo(objectType: string | null | undefined): boolean {
  if (!objectType || objectType === 'all') {
    return false;
  }
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return false;
  }
  return def.supported_updates.includes(UPDATE_TYPES.GEO);
}

/** Whether object type has TAG_CATEGORY in supposed_updates (right filter column). */
export function objectTypeHasTagCategoryFilters(objectType: string | null | undefined): boolean {
  if (!objectType || objectType === 'all') {
    return false;
  }
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

/** Rating dimension names from supposed_updates for an object type. */
export function getRatingDimensionNamesForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  const entry = def.supposed_updates.find(
    (u) => u.update_type === UPDATE_TYPES.AGGREGATE_RATING,
  );
  const raw = entry?.values ?? [];
  return raw.filter((v): v is string => typeof v === 'string');
}
