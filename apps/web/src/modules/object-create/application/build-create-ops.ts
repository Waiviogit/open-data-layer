import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import {
  chunkOdlEventsIntoOps,
  HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
  isDefaultActiveStatusUpdate,
  OBJECT_CREATE_MAX_OPS_PER_TRX,
  parseObjectIdFromCreateOdlJson,
  type CustomJsonOp,
  type OdlCreateEvent,
  type OdlUpdateCreateValueKind,
} from '@opden-data-layer/hive-broadcast';

import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';

import { isDuplicateRefValue } from '../domain/duplicate-ref-field-values';
import { isTagCategoryItemFilled } from '../domain/tag-category-item-value';
import { filterFieldsForObjectType } from '../domain/filter-fields-for-object-type';
import { groupFieldsByPriority } from '../domain/group-fields-by-priority';
import { isEntryValid } from '../domain/object-health-score';
import type { FieldEntry } from '../domain/object-create.types';
import { listGalleryAlbumNamesFromFields } from '../domain/supposed-update-seeds';

export {
  OBJECT_CREATE_MAX_OPS_PER_TRX,
  parseObjectIdFromCreateOdlJson,
  type OdlCreateEvent,
};

function resolveValueFieldKey(valueKind: OdlUpdateCreateValueKind): string {
  if (valueKind === 'object_ref' || valueKind === 'user_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

function buildUpdateCreateEventPayload(
  objectId: string,
  entry: FieldEntry,
): Record<string, unknown> | null {
  const definition = UPDATE_REGISTRY[entry.updateType];
  if (!definition) {
    return null;
  }
  const parsed = validateUpdateValue(definition, entry.value);
  if (!parsed.success) {
    return null;
  }

  const valueField = resolveValueFieldKey(definition.value_kind);
  const payload: Record<string, unknown> = {
    object_id: objectId,
    update_type: entry.updateType,
    [valueField]: parsed.value,
  };
  if (definition.localizable && entry.locale) {
    payload['locale'] = entry.locale;
  }
  return payload;
}

function readGalleryItemAlbumName(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const album = (value as Record<string, unknown>).album;
  if (typeof album !== 'string') {
    return null;
  }
  const trimmed = album.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensureGalleryAlbumEvent(
  objectId: string,
  albumName: string,
  acceptedFields: FieldEntry[],
  events: OdlCreateEvent[],
): void {
  const existing = new Set(listGalleryAlbumNamesFromFields(acceptedFields));
  if (existing.has(albumName)) {
    return;
  }
  const syntheticEntry: FieldEntry = {
    entryKey: `imageGallery:ensure:${albumName}`,
    updateType: UPDATE_TYPES.IMAGE_GALLERY,
    value: albumName,
  };
  const payload = buildUpdateCreateEventPayload(objectId, syntheticEntry);
  if (!payload) {
    return;
  }
  acceptedFields.push(syntheticEntry);
  events.push({
    action: 'update_create',
    v: 1,
    payload,
  });
}

export type BuildCreateOpsInput = {
  objectId: string;
  objectType: string;
  creator: string;
  odlCustomJsonId: string;
  fields: readonly FieldEntry[];
  language: string;
};

function serializeEnvelope(events: readonly OdlCreateEvent[]): string {
  return JSON.stringify({ events });
}

/**
 * Builds all ODL create events (`object_create` + `update_create`) for publish.
 */
export function buildAllCreateEvents(input: BuildCreateOpsInput): OdlCreateEvent[] {
  if (!OBJECT_TYPE_REGISTRY[input.objectType]) {
    throw new Error(`Unknown object_type: ${input.objectType}`);
  }

  const fieldsForType = filterFieldsForObjectType(input.fields, input.objectType);

  const events: OdlCreateEvent[] = [
    {
      action: 'object_create',
      v: 1,
      payload: {
        object_id: input.objectId,
        object_type: input.objectType,
      },
    },
  ];

  const acceptedFields: FieldEntry[] = [];
  for (const entry of fieldsForType) {
    if (isDefaultActiveStatusUpdate(entry.updateType, entry.value)) {
      continue;
    }
    if (
      entry.updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
      !isTagCategoryItemFilled(entry.value)
    ) {
      continue;
    }
    if (
      isDuplicateRefValue(
        acceptedFields,
        entry.updateType,
        entry.entryKey,
        entry.value,
      )
    ) {
      continue;
    }
    const locale =
      entry.locale && entry.locale.length > 0 ? entry.locale : input.language;
    if (entry.updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
      const definition = UPDATE_REGISTRY[entry.updateType];
      const preParsed = definition
        ? validateUpdateValue(definition, entry.value)
        : null;
      if (preParsed?.success) {
        const albumName = readGalleryItemAlbumName(preParsed.value);
        if (albumName) {
          ensureGalleryAlbumEvent(
            input.objectId,
            albumName,
            acceptedFields,
            events,
          );
        }
      }
    }
    const payload = buildUpdateCreateEventPayload(input.objectId, {
      ...entry,
      locale,
    });
    if (payload) {
      acceptedFields.push(entry);
      events.push({
        action: 'update_create',
        v: 1,
        payload,
      });
    }
  }

  const requiredTypes = groupFieldsByPriority(input.objectType).required;
  for (const updateType of requiredTypes) {
    const hasValidEntry = fieldsForType.some(
      (e) => e.updateType === updateType && isEntryValid(e),
    );
    const hasEvent = events.some(
      (e) =>
        e.action === 'update_create' &&
        (e.payload as { update_type?: string }).update_type === updateType,
    );
    if (!hasValidEntry || !hasEvent) {
      throw new Error(`Required field not ready for publish: ${updateType}`);
    }
  }

  return events;
}

/**
 * Full ODL envelope JSON (all events in one string). Used for IPFS upload.
 */
export function buildCreateOdlJson(input: BuildCreateOpsInput): string {
  return serializeEnvelope(buildAllCreateEvents(input));
}

/**
 * Splits create events into one or more Hive `custom_json` ops (≤ 8 192 bytes each, max 5 per trx).
 */
export function buildCreateOps(input: BuildCreateOpsInput): CustomJsonOp[] {
  const events = buildAllCreateEvents(input);
  return chunkOdlEventsIntoOps({
    events,
    creator: input.creator,
    id: input.odlCustomJsonId,
  });
}

export { HIVE_CUSTOM_OP_DATA_MAX_LENGTH };
