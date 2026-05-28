import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { GroupedFieldTypes } from './object-create.types';

/** Always treated as required when supported by the object type. */
export const REQUIRED_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.IMAGE,
];

/** Extra required updates per object type (when supported). */
export const TYPE_SPECIFIC_REQUIRED_UPDATES: Readonly<
  Record<string, readonly string[]>
> = {
  recipe: [UPDATE_TYPES.INGREDIENTS],
};

/** Update types used for media section (also may appear in core fields). */
export const MEDIA_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.IMAGE_BACKGROUND,
  UPDATE_TYPES.IMAGE_GALLERY,
  UPDATE_TYPES.IMAGE_GALLERY_ITEM,
];

/** Object-reference updates shown in the relations block. */
export const RELATION_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.PARENT,
  UPDATE_TYPES.IS_RELATED_TO,
  UPDATE_TYPES.ADD_ON,
  UPDATE_TYPES.IS_SIMILAR_TO,
  UPDATE_TYPES.DELEGATION,
  UPDATE_TYPES.AUTHOR,
  UPDATE_TYPES.LIST_ITEM,
  UPDATE_TYPES.MERCHANT,
  UPDATE_TYPES.MANUFACTURER,
  UPDATE_TYPES.BRAND,
  UPDATE_TYPES.PUBLISHER,
  UPDATE_TYPES.FEATURED,
  UPDATE_TYPES.MAP_OBJECTS_LIST,
];

const EXCLUDED_FROM_EDITOR: readonly string[] = [
  UPDATE_TYPES.STATUS,
  UPDATE_TYPES.PIN,
  UPDATE_TYPES.REMOVE,
];

const RECOMMENDED_EXTRA: readonly string[] = [
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.CATEGORY,
  UPDATE_TYPES.TAG_CATEGORY,
  UPDATE_TYPES.TAG_CATEGORY_ITEM,
];

/** Core identity fields (also used by publish dock summary). */
export const IDENTITY_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.IDENTIFIER,
  UPDATE_TYPES.CATEGORY,
];

const CLASSIFICATION_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.TAG_CATEGORY,
  UPDATE_TYPES.TAG_CATEGORY_ITEM,
  UPDATE_TYPES.AGGREGATE_RATING,
];

export type SemanticBlockId =
  | 'required'
  | 'identity'
  | 'context'
  | 'classification'
  | 'advanced';

export interface SemanticBlock {
  id: SemanticBlockId;
  types: readonly string[];
}

function uniqueOrdered(types: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of types) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/**
 * Buckets supported update types for progressive disclosure in the create workspace.
 */
export function groupFieldsByPriority(objectType: string): GroupedFieldTypes {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return { required: [], recommended: [], advanced: [] };
  }

  const supported = def.supported_updates.filter(
    (t) => !EXCLUDED_FROM_EDITOR.includes(t),
  );
  const supportedSet = new Set(supported);

  const typeSpecific = TYPE_SPECIFIC_REQUIRED_UPDATES[objectType] ?? [];
  const required = uniqueOrdered([
    ...REQUIRED_UPDATE_TYPES.filter((t) => supportedSet.has(t)),
    ...typeSpecific.filter((t) => supportedSet.has(t)),
  ]);

  const fromSupposed = def.supposed_updates.map((u) => u.update_type);
  const recommended = uniqueOrdered([
    ...fromSupposed,
    ...RECOMMENDED_EXTRA,
  ]).filter(
    (t) =>
      supportedSet.has(t) &&
      !required.includes(t) &&
      !RELATION_UPDATE_TYPES.includes(t),
  );

  const advanced = supported.filter(
    (t) =>
      !required.includes(t) &&
      !recommended.includes(t) &&
      !RELATION_UPDATE_TYPES.includes(t) &&
      !MEDIA_UPDATE_TYPES.includes(t),
  );

  return { required, recommended, advanced };
}

export function relationTypesForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  return RELATION_UPDATE_TYPES.filter((t) => def.supported_updates.includes(t));
}

export function mediaTypesForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  return MEDIA_UPDATE_TYPES.filter((t) => def.supported_updates.includes(t));
}

export function allEditableTypesForObjectType(objectType: string): string[] {
  const def = OBJECT_TYPE_REGISTRY[objectType];
  if (!def) {
    return [];
  }
  return def.supported_updates.filter((t) => !EXCLUDED_FROM_EDITOR.includes(t));
}

/**
 * Display-only semantic sections for the create workspace editor.
 * Required types are always in the first block (see `groupFieldsByPriority`).
 * Does not affect publish validation.
 */
export function getSemanticBlocks(objectType: string): SemanticBlock[] {
  const groups = groupFieldsByPriority(objectType);
  const requiredSet = new Set(groups.required);
  const withoutRequired = (types: readonly string[]) =>
    uniqueOrdered(types.filter((t) => !requiredSet.has(t)));

  const identitySet = new Set(IDENTITY_UPDATE_TYPES);
  const classificationSet = new Set(CLASSIFICATION_UPDATE_TYPES);
  const mediaAndRelations = new Set([
    ...MEDIA_UPDATE_TYPES,
    ...RELATION_UPDATE_TYPES,
  ]);

  const optionalPool = [...groups.recommended, ...groups.advanced];

  const identityFiltered = withoutRequired(
    optionalPool.filter((t) => identitySet.has(t)),
  ).filter((t) => !mediaAndRelations.has(t));

  const classificationFiltered = withoutRequired(
    optionalPool.filter((t) => classificationSet.has(t)),
  ).filter((t) => !mediaAndRelations.has(t));

  const contextFiltered = withoutRequired(
    groups.recommended.filter(
      (t) => !identitySet.has(t) && !classificationSet.has(t),
    ),
  ).filter((t) => !mediaAndRelations.has(t));

  const assigned = new Set([
    ...groups.required,
    ...identityFiltered,
    ...contextFiltered,
    ...classificationFiltered,
    ...mediaAndRelations,
  ]);

  const advanced = withoutRequired(
    groups.advanced.filter((t) => !assigned.has(t)),
  );

  const blocks: SemanticBlock[] = [];
  if (groups.required.length > 0) {
    blocks.push({ id: 'required', types: groups.required });
  }
  if (identityFiltered.length > 0) {
    blocks.push({ id: 'identity', types: identityFiltered });
  }
  if (contextFiltered.length > 0) {
    blocks.push({ id: 'context', types: contextFiltered });
  }
  if (classificationFiltered.length > 0) {
    blocks.push({ id: 'classification', types: classificationFiltered });
  }
  if (advanced.length > 0) {
    blocks.push({ id: 'advanced', types: advanced });
  }
  return blocks;
}
