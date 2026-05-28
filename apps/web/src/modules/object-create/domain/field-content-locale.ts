import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import type { FieldEntry } from './object-create.types';

/** Applies workspace content locale to every localizable field row. */
export function applyContentLocaleToFields(
  fields: readonly FieldEntry[],
  language: string,
): FieldEntry[] {
  return fields.map((entry) => {
    const def = UPDATE_REGISTRY[entry.updateType];
    if (!def?.localizable) {
      return entry;
    }
    return { ...entry, locale: language };
  });
}

export function isLocalizableUpdateType(updateType: string): boolean {
  return Boolean(UPDATE_REGISTRY[updateType]?.localizable);
}
