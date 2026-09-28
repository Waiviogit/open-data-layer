import { OBJECT_TYPES, UPDATE_TYPES } from '@opden-data-layer/core';

export const FIELD_REFERENCE_SOURCE_TYPES = [
  OBJECT_TYPES.PERSON,
  OBJECT_TYPES.BUSINESS,
] as const;

export type FieldReferenceSourceType = (typeof FIELD_REFERENCE_SOURCE_TYPES)[number];

export type FieldReferenceRule = {
  referenceObjectTypes: readonly string[];
  updateTypes: readonly string[];
};

/** Reverse lookup: objects whose schema refs point at a person or business source. */
export const FIELD_REFERENCE_RULES: Record<FieldReferenceSourceType, FieldReferenceRule> = {
  [OBJECT_TYPES.PERSON]: {
    referenceObjectTypes: [OBJECT_TYPES.BOOK],
    updateTypes: [UPDATE_TYPES.AUTHOR],
  },
  [OBJECT_TYPES.BUSINESS]: {
    referenceObjectTypes: [
      OBJECT_TYPES.PRODUCT,
      OBJECT_TYPES.BOOK,
      OBJECT_TYPES.SERVICE_OFFER,
      OBJECT_TYPES.SERVICE_REQUEST,
    ],
    updateTypes: [
      UPDATE_TYPES.MERCHANT,
      UPDATE_TYPES.MANUFACTURER,
      UPDATE_TYPES.BRAND,
      UPDATE_TYPES.PUBLISHER,
      UPDATE_TYPES.PROVIDER,
    ],
  },
};

export function isFieldReferenceSourceType(
  objectType: string,
): objectType is FieldReferenceSourceType {
  return (FIELD_REFERENCE_SOURCE_TYPES as readonly string[]).includes(objectType);
}

export function getFieldReferenceRule(
  sourceObjectType: string,
): FieldReferenceRule | null {
  if (!isFieldReferenceSourceType(sourceObjectType)) {
    return null;
  }
  return FIELD_REFERENCE_RULES[sourceObjectType];
}

export function isAllowedFieldReferenceObjectType(
  sourceObjectType: string,
  referenceObjectType: string,
): boolean {
  const rule = getFieldReferenceRule(sourceObjectType);
  if (!rule) {
    return false;
  }
  return rule.referenceObjectTypes.includes(referenceObjectType);
}
