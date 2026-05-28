import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';

import {
  groupFieldsByPriority,
  MEDIA_UPDATE_TYPES,
  RELATION_UPDATE_TYPES,
} from './group-fields-by-priority';
import { supposedValueCountByType } from './supposed-update-seeds';
import { isTagCategoryItemFilled } from './tag-category-item-value';
import type { FieldEntry, HealthScore } from './object-create.types';

export type PublishReadiness = {
  ready: boolean;
  /** Required update types with no row or empty value. */
  missingRequired: string[];
  /** Required rows present but failing Zod / schema validation. */
  invalidRequired: string[];
  /** `tagCategoryItem` rows with empty tag value (draft chip). */
  incompleteTagItems: number;
  /** Object id has no name slug (`prefix` only). */
  missingObjectIdSlug: boolean;
};

export function isFieldFilled(entry: FieldEntry): boolean {
  const def = UPDATE_REGISTRY[entry.updateType];
  if (!def) {
    return false;
  }
  if (entry.updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM) {
    return isTagCategoryItemFilled(entry.value);
  }
  const raw = entry.value;
  if (raw === null || raw === undefined) {
    return false;
  }
  if (def.value_kind === 'text' || def.value_kind === 'object_ref') {
    return typeof raw === 'string' && raw.trim().length > 0;
  }
  if (def.value_kind === 'geo') {
    if (!raw || typeof raw !== 'object') {
      return false;
    }
    const g = raw as { latitude?: unknown; longitude?: unknown };
    const lat = String(g.latitude ?? '').trim();
    const lon = String(g.longitude ?? '').trim();
    return lat.length > 0 && lon.length > 0;
  }
  if (def.value_kind === 'json') {
    if (Array.isArray(raw)) {
      return raw.some((v) => typeof v === 'string' && v.trim().length > 0);
    }
    if (typeof raw === 'string') {
      return raw.trim().length > 0 && raw.trim() !== '{\n  \n}';
    }
    if (typeof raw === 'object' && raw !== null) {
      return Object.values(raw as Record<string, unknown>).some((v) => {
        if (v === '' || v === null || v === undefined) {
          return false;
        }
        if (typeof v === 'string') {
          return v.trim().length > 0;
        }
        return true;
      });
    }
    return false;
  }
  return Boolean(raw);
}

/** Whether the field value passes registry Zod validation (publish gate). */
export function isEntryValid(entry: FieldEntry): boolean {
  const def = UPDATE_REGISTRY[entry.updateType];
  if (!def) {
    return false;
  }
  return validateUpdateValue(def, entry.value).success;
}

function hasObjectIdSlug(objectId: string, objectIdPrefix: string): boolean {
  const slugPart = objectId.slice(objectIdPrefix.length);
  return slugPart.startsWith('-') && slugPart.length > 1;
}

function countFilled(
  types: readonly string[],
  fields: readonly FieldEntry[],
  objectType: string,
  isComplete: (entry: FieldEntry) => boolean = isFieldFilled,
): { filled: number; total: number } {
  const supposedCounts = supposedValueCountByType(objectType);
  let filled = 0;
  let total = 0;
  for (const type of types) {
    const rows = fields.filter((f) => f.updateType === type);
    const expected = supposedCounts.get(type) ?? (rows.length > 0 ? rows.length : 1);
    total += expected;
    filled += rows.filter((e) => isComplete(e)).length;
  }
  return { filled: Math.min(filled, total), total };
}

export function computeObjectHealthScore(
  objectType: string | null,
  fields: readonly FieldEntry[],
): HealthScore {
  if (!objectType) {
    return {
      required: { filled: 0, total: 0 },
      recommended: { filled: 0, total: 0 },
      hasMedia: false,
      hasRelations: false,
      percent: 0,
    };
  }

  const groups = groupFieldsByPriority(objectType);
  const required = countFilled(groups.required, fields, objectType, isEntryValid);
  const recommended = countFilled(groups.recommended, fields, objectType);

  const hasMedia = fields.some(
    (f) => MEDIA_UPDATE_TYPES.includes(f.updateType) && isEntryValid(f),
  );
  const hasRelations = fields.some(
    (f) => RELATION_UPDATE_TYPES.includes(f.updateType) && isFieldFilled(f),
  );

  const totalUnits =
    required.total + recommended.total + (groups.required.includes('image') ? 0 : 1) + 1;
  const filledUnits =
    required.filled +
    recommended.filled +
    (hasMedia ? 1 : 0) +
    (hasRelations ? 0.5 : 0);
  const percent =
    totalUnits > 0 ? Math.min(100, Math.round((filledUnits / totalUnits) * 100)) : 0;

  return {
    required,
    recommended,
    hasMedia,
    hasRelations,
    percent,
  };
}

/**
 * Full publish gate: object id slug + every required update type present and schema-valid.
 */
export function validatePublishReadiness(
  objectType: string | null,
  fields: readonly FieldEntry[],
  objectId: string,
  objectIdPrefix: string,
): PublishReadiness {
  const missingRequired: string[] = [];
  const invalidRequired: string[] = [];
  const missingObjectIdSlug = !hasObjectIdSlug(objectId, objectIdPrefix);

  const incompleteTagItems = fields.filter(
    (f) =>
      f.updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
      !isTagCategoryItemFilled(f.value),
  ).length;

  if (!objectType) {
    return {
      ready: false,
      missingRequired,
      invalidRequired,
      incompleteTagItems,
      missingObjectIdSlug: true,
    };
  }

  const groups = groupFieldsByPriority(objectType);
  for (const updateType of groups.required) {
    const rows = fields.filter((f) => f.updateType === updateType);
    if (rows.length === 0) {
      missingRequired.push(updateType);
      continue;
    }
    if (rows.some((e) => isEntryValid(e))) {
      continue;
    }
    if (rows.some((e) => isFieldFilled(e))) {
      invalidRequired.push(updateType);
    } else {
      missingRequired.push(updateType);
    }
  }

  const ready =
    !missingObjectIdSlug &&
    missingRequired.length === 0 &&
    invalidRequired.length === 0 &&
    incompleteTagItems === 0;

  return {
    ready,
    missingRequired,
    invalidRequired,
    incompleteTagItems,
    missingObjectIdSlug,
  };
}

export function canPublishObject(
  objectType: string | null,
  fields: readonly FieldEntry[],
  objectId = '',
  objectIdPrefix = '',
): boolean {
  return validatePublishReadiness(
    objectType,
    fields,
    objectId,
    objectIdPrefix,
  ).ready;
}
