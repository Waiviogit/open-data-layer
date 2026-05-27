import type { UpdateDefinition } from '@opden-data-layer/core';
import { UPDATE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedField, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { GOVERNANCE_UPDATE_TYPES } from '../governance/governance.constants';
import { buildGalleryAlbums, pickAvatarUrlFromProjectedImage } from './build-gallery-albums';
import { projectFieldValue } from './project-field';
import type { ProjectObjectInput, ProjectedObject, RefSummary } from './projected-object.types';
import { SEMANTIC_TYPE_BY_OBJECT_TYPE } from './semantic-types';

export type ProjectedObjectCore = Omit<
  ProjectedObject,
  'hasAdministrativeAuthority' | 'hasOwnershipAuthority'
>;

const GOVERNANCE_SKIP = new Set(GOVERNANCE_UPDATE_TYPES);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function linkToObjectIdFromMenuItemJson(valueJson: unknown): string | null {
  if (!isPlainRecord(valueJson)) {
    return null;
  }
  const raw = valueJson['link_to_object'];
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function enrichMenuItemRowsWithRefs(
  rows: unknown,
  refSummariesById: Map<string, RefSummary>,
): unknown {
  if (!Array.isArray(rows)) {
    return rows;
  }
  return rows.map((row) => {
    if (!isPlainRecord(row)) {
      return row;
    }
    const linkId = linkToObjectIdFromMenuItemJson(row);
    if (!linkId) {
      return row;
    }
    const summary = refSummariesById.get(linkId);
    if (!summary) {
      return row;
    }
    return { ...row, object: summary };
  });
}

export function collectObjectRefIdsFromView(view: ResolvedObjectView): string[] {
  const ids = new Set<string>();

  const collectFromMenuItemValues = (field: ResolvedField) => {
    for (const u of field.values) {
      if (u.validity_status !== 'VALID') {
        continue;
      }
      const id = linkToObjectIdFromMenuItemJson(u.value_json);
      if (id) {
        ids.add(id);
      }
    }
  };

  for (const [updateType, field] of Object.entries(view.fields)) {
    if (GOVERNANCE_SKIP.has(updateType)) {
      continue;
    }
    const def = UPDATE_REGISTRY[updateType];

    if (updateType === UPDATE_TYPES.MENU_ITEM) {
      if (def) {
        collectFromMenuItemValues(field);
      }
      continue;
    }

    if (!def || def.value_kind !== 'object_ref') {
      continue;
    }

    for (const u of field.values) {
      if (u.validity_status !== 'VALID') {
        continue;
      }
      const t = u.value_text?.trim();
      if (t) {
        ids.add(t);
      }
    }
  }

  return [...ids];
}

function projectObjectRefField(
  field: ResolvedField,
  def: UpdateDefinition,
  refSummariesById: Map<string, RefSummary>,
): RefSummary | RefSummary[] | null {
  const valid = field.values.filter((u) => u.validity_status === 'VALID');
  if (def.cardinality === 'single') {
    const u = valid[0];
    const id = u?.value_text?.trim();
    if (!id) {
      return null;
    }
    const s = refSummariesById.get(id);
    if (!s) {
      return null;
    }
    return u ? { ...s, addedAtUnix: u.created_at_unix } : s;
  }
  const summaries: RefSummary[] = [];
  for (const u of valid) {
    const id = u.value_text?.trim();
    if (!id) {
      continue;
    }
    const s = refSummariesById.get(id);
    if (s) {
      summaries.push({
        ...s,
        addedAtUnix: u.created_at_unix,
      });
    }
  }
  return summaries;
}

/**
 * Builds the core projection (fields, ids, semantic type). Authority flags are added in {@link ObjectProjectionService}.
 */
export function projectObjectCore(input: ProjectObjectInput): ProjectedObjectCore {
  const { view, ipfsGatewayBaseUrl, refSummariesById, viewerAccount, rankVoteProjection } = input;
  const fields: Record<string, unknown> = {};

  for (const [updateType, field] of Object.entries(view.fields)) {
    if (GOVERNANCE_SKIP.has(updateType)) {
      continue;
    }
    const def = UPDATE_REGISTRY[updateType];
    if (!def) {
      continue;
    }
    const key = updateType;

    if (updateType === UPDATE_TYPES.MENU_ITEM) {
      const projected = projectFieldValue(
        field,
        updateType,
        ipfsGatewayBaseUrl,
        viewerAccount,
        rankVoteProjection,
      );
      fields[key] = enrichMenuItemRowsWithRefs(projected, refSummariesById);
      continue;
    }

    if (def.value_kind === 'object_ref') {
      fields[key] = projectObjectRefField(field, def, refSummariesById);
    } else {
      fields[key] = projectFieldValue(
        field,
        updateType,
        ipfsGatewayBaseUrl,
        viewerAccount,
        rankVoteProjection,
      );
    }
  }

  const gallery = buildGalleryAlbums({
    imageGallery: fields.imageGallery,
    imageGalleryItem: fields.imageGalleryItem,
    avatarUrl: pickAvatarUrlFromProjectedImage(fields.image),
  });

  return {
    object_id: view.object_id,
    object_type: view.object_type,
    semantic_type: SEMANTIC_TYPE_BY_OBJECT_TYPE[view.object_type] ?? null,
    weight: view.weight,
    fields,
    previewGallery: gallery.previewGallery,
    galleryAlbums: gallery.albums,
  };
}
