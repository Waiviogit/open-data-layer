import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { initialFormValueForUpdateTypeWithContext } from '@/modules/object-updates/application/tag-category-item-form-value';

import { groupFieldsByPriority } from './group-fields-by-priority';
import type { FieldEntry } from './object-create.types';

function stringValues(raw: readonly unknown[]): string[] {
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/** Gallery album names already present in the draft (from `imageGallery` entries). */
export function listGalleryAlbumNamesFromFields(
  fields: readonly FieldEntry[],
): string[] {
  const names: string[] = [];
  for (const entry of fields) {
    if (entry.updateType !== UPDATE_TYPES.IMAGE_GALLERY) {
      continue;
    }
    if (typeof entry.value === 'string' && entry.value.trim().length > 0) {
      names.push(entry.value.trim());
    }
  }
  return names;
}

/** Tag category names already present in the draft (from `tagCategory` entries). */
export function listTagCategoryNamesFromFields(
  fields: readonly FieldEntry[],
): string[] {
  const names: string[] = [];
  for (const entry of fields) {
    if (entry.updateType !== UPDATE_TYPES.TAG_CATEGORY) {
      continue;
    }
    if (typeof entry.value === 'string' && entry.value.trim().length > 0) {
      names.push(entry.value.trim());
    }
  }
  return names;
}

/**
 * Builds initial field rows: required (empty) + one row per `supposed_updates` value
 * (e.g. tag categories and rating dimensions pre-filled from the registry).
 */
export function seedFieldsForObjectType(
  objectType: string,
  language: string,
): FieldEntry[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }

  const groups = groupFieldsByPriority(objectType);
  const entries: FieldEntry[] = [];
  const seededTypeKeys = new Set<string>();

  for (const updateType of groups.required) {
    entries.push({
      entryKey: updateType,
      updateType,
      value: initialFormValueForUpdateTypeWithContext(updateType, []),
      locale: language,
    });
    seededTypeKeys.add(updateType);
  }

  for (const supposed of def.supposed_updates) {
    const values = stringValues(supposed.values);
    for (const value of values) {
      entries.push({
        entryKey: `${supposed.update_type}:${value}`,
        updateType: supposed.update_type,
        value,
        locale: language,
      });
      seededTypeKeys.add(supposed.update_type);
    }
  }

  const tagNames = listTagCategoryNamesFromFields(entries);

  for (const updateType of groups.recommended) {
    // Tags are added per category via "+ Tag (Cuisine)" — never seed an empty row.
    if (updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM) {
      continue;
    }
    if (
      entries.some((e) => e.updateType === updateType) &&
      (updateType === UPDATE_TYPES.TAG_CATEGORY ||
        updateType === UPDATE_TYPES.AGGREGATE_RATING)
    ) {
      continue;
    }
    if (seededTypeKeys.has(updateType)) {
      continue;
    }
    entries.push({
      entryKey: updateType,
      updateType,
      value: initialFormValueForUpdateTypeWithContext(updateType, tagNames),
      locale: language,
    });
    seededTypeKeys.add(updateType);
  }

  return entries;
}

/** Expected row count per update type from `supposed_updates` (for section progress). */
export function supposedValueCountByType(
  objectType: string,
): Map<string, number> {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  const counts = new Map<string, number>();
  if (!def) {
    return counts;
  }
  for (const supposed of def.supposed_updates) {
    const n = stringValues(supposed.values).length;
    if (n > 0) {
      counts.set(supposed.update_type, n);
    }
  }
  return counts;
}
