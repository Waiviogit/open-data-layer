import { OBJECT_TYPES } from '@opden-data-layer/core/object-type-registry';

export const FIELD_REFERENCE_SOURCE_TYPES = [
  OBJECT_TYPES.PERSON,
  OBJECT_TYPES.BUSINESS,
] as const;

export type FieldReferenceSourceType = (typeof FIELD_REFERENCE_SOURCE_TYPES)[number];

/** Allowed target object types per source type (mirrors query-api field-reference rules). */
export const FIELD_REFERENCE_TARGET_TYPES: Record<FieldReferenceSourceType, readonly string[]> = {
  [OBJECT_TYPES.PERSON]: [OBJECT_TYPES.BOOK],
  [OBJECT_TYPES.BUSINESS]: [
    OBJECT_TYPES.PRODUCT,
    OBJECT_TYPES.BOOK,
    OBJECT_TYPES.SERVICE_OFFER,
    OBJECT_TYPES.SERVICE_REQUEST,
  ],
};

/** Singular query-api object type → legacy plural public URL segment. */
export const FIELD_REFERENCE_PATH_SEGMENT_BY_TYPE: Record<string, string> = {
  [OBJECT_TYPES.BOOK]: 'books',
  [OBJECT_TYPES.PRODUCT]: 'products',
  [OBJECT_TYPES.SERVICE_OFFER]: 'service-offers',
  [OBJECT_TYPES.SERVICE_REQUEST]: 'service-requests',
};

/** Legacy plural public URL segment → singular query-api object type. */
export const FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT: Record<string, string> = {
  books: OBJECT_TYPES.BOOK,
  products: OBJECT_TYPES.PRODUCT,
  'service-offers': OBJECT_TYPES.SERVICE_OFFER,
  'service-requests': OBJECT_TYPES.SERVICE_REQUEST,
};

export const FIELD_REFERENCE_PATH_SEGMENTS = Object.keys(
  FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT,
) as Array<keyof typeof FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT>;

export function isFieldReferenceSourceType(
  objectType: string,
): objectType is FieldReferenceSourceType {
  return (FIELD_REFERENCE_SOURCE_TYPES as readonly string[]).includes(objectType);
}

export function isFieldReferencePathSegment(
  segment: string,
): segment is keyof typeof FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT {
  return segment in FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT;
}

export function resolveFieldReferenceTypeFromPathSegment(segment: string): string | null {
  if (!isFieldReferencePathSegment(segment)) {
    return null;
  }
  return FIELD_REFERENCE_TYPE_BY_PATH_SEGMENT[segment];
}

export function resolveFieldReferencePathSegmentFromType(
  referenceObjectType: string,
): string | null {
  return FIELD_REFERENCE_PATH_SEGMENT_BY_TYPE[referenceObjectType] ?? null;
}

export function isAllowedFieldReferenceObjectType(
  sourceObjectType: string,
  referenceObjectType: string,
): boolean {
  if (!isFieldReferenceSourceType(sourceObjectType)) {
    return false;
  }
  return FIELD_REFERENCE_TARGET_TYPES[sourceObjectType].includes(referenceObjectType);
}

export function isAllowedFieldReferencePathSegment(
  sourceObjectType: string,
  pathSegment: string,
): boolean {
  const referenceObjectType = resolveFieldReferenceTypeFromPathSegment(pathSegment);
  if (referenceObjectType == null) {
    return false;
  }
  return isAllowedFieldReferenceObjectType(sourceObjectType, referenceObjectType);
}
