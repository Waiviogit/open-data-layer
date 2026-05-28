import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { FieldEntry } from './object-create.types';

/** Unique tag values from filled `tagCategoryItem` rows (draft workspace). */
export function extractSeoKeywords(fields: readonly FieldEntry[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (f.updateType !== UPDATE_TYPES.TAG_CATEGORY_ITEM) {
      continue;
    }
    const raw = f.value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }
    const v = (raw as { value?: unknown }).value;
    if (typeof v === 'string' && v.trim().length > 0) {
      out.push(v.trim());
    }
  }
  return [...new Set(out)];
}
