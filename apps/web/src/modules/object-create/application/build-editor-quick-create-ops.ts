import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import {
  buildCustomJsonOp,
  HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
  isDefaultActiveStatusUpdate,
  type CustomJsonOp,
  type OdlUpdateCreateValueKind,
} from '@opden-data-layer/hive-broadcast';

import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';

import { isDuplicateRefValue } from '../domain/duplicate-ref-field-values';
import { filterFieldsForObjectType } from '../domain/filter-fields-for-object-type';
import { buildObjectId, generatePrefix } from '../domain/generate-object-id';
import { isEntryValid } from '../domain/object-health-score';
import type { FieldEntry } from '../domain/object-create.types';
import { isTagCategoryItemFilled } from '../domain/tag-category-item-value';
import { seedFieldsForObjectType } from '../domain/supposed-update-seeds';
import {
  OBJECT_CREATE_MAX_OPS_PER_TRX,
  type BuildCreateOpsInput,
} from './build-create-ops';

export type OdlQuickCreateEvent = {
  action: 'object_create' | 'update_create' | 'object_follow';
  v: 1;
  event_id?: string;
  payload: Record<string, unknown>;
};

export type BuildEditorQuickCreateOpsInput = BuildCreateOpsInput & {
  followObject?: boolean;
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

function jsonByteLength(json: string): number {
  return new TextEncoder().encode(json).length;
}

function serializeEnvelope(events: readonly OdlQuickCreateEvent[]): string {
  return JSON.stringify({ events });
}

/**
 * Seeds fields for editor quick create and applies the user-provided name.
 */
export function prepareEditorQuickCreateFields(
  objectType: string,
  language: string,
  name: string,
  objectIdPrefix: string = generatePrefix(),
): { objectId: string; objectIdPrefix: string; fields: FieldEntry[] } {
  const trimmedName = name.trim();
  const fields = seedFieldsForObjectType(objectType, language).map((entry) =>
    entry.updateType === UPDATE_TYPES.NAME
      ? { ...entry, value: trimmedName }
      : entry,
  );
  return {
    objectIdPrefix,
    objectId: buildObjectId(objectIdPrefix, trimmedName),
    fields,
  };
}

/**
 * Builds ODL events for editor quick create: `object_create`, valid `name`,
 * pre-filled supposed updates (tag categories, ratings). Skips empty required
 * fields such as description and image.
 */
export function buildEditorQuickCreateEvents(
  input: BuildEditorQuickCreateOpsInput,
): OdlQuickCreateEvent[] {
  if (!OBJECT_TYPE_REGISTRY[input.objectType]) {
    throw new Error(`Unknown object_type: ${input.objectType}`);
  }

  const fieldsForType = filterFieldsForObjectType(input.fields, input.objectType);
  const nameEntry = fieldsForType.find((e) => e.updateType === UPDATE_TYPES.NAME);
  if (!nameEntry || !isEntryValid(nameEntry)) {
    throw new Error('name_required');
  }

  const events: OdlQuickCreateEvent[] = [
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
    const payload = buildUpdateCreateEventPayload(input.objectId, {
      ...entry,
      locale,
    });
    if (!payload) {
      continue;
    }

    acceptedFields.push(entry);

    events.push({
      action: 'update_create',
      v: 1,
      payload,
    });
  }

  const hasNameEvent = events.some(
    (e) =>
      e.action === 'update_create' &&
      (e.payload as { update_type?: string }).update_type === UPDATE_TYPES.NAME,
  );
  if (!hasNameEvent) {
    throw new Error('name_required');
  }

  if (input.followObject) {
    events.push({
      action: 'object_follow',
      v: 1,
      payload: {
        object_id: input.objectId,
        method: 'follow',
      },
    });
  }

  return events;
}

function buildCustomJsonOpFromEvents(
  input: Pick<BuildEditorQuickCreateOpsInput, 'creator' | 'odlCustomJsonId'>,
  events: readonly OdlQuickCreateEvent[],
): CustomJsonOp {
  return buildCustomJsonOp({
    required_auths: [],
    required_posting_auths: [input.creator],
    id: input.odlCustomJsonId,
    json: serializeEnvelope(events),
  });
}

/**
 * Editor quick create: chunk events into Hive `custom_json` ops (≤ 8192 bytes, max 5).
 */
export function buildEditorQuickCreateOps(
  input: BuildEditorQuickCreateOpsInput,
): CustomJsonOp[] {
  const events = buildEditorQuickCreateEvents(input);
  const chunks: OdlQuickCreateEvent[][] = [];
  let current: OdlQuickCreateEvent[] = [];

  for (const event of events) {
    const candidate = [...current, event];
    const candidateJson = serializeEnvelope(candidate);
    const candidateBytes = jsonByteLength(candidateJson);

    if (candidateBytes <= HIVE_CUSTOM_OP_DATA_MAX_LENGTH) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
      current = [event];
      const singleJson = serializeEnvelope(current);
      const singleBytes = jsonByteLength(singleJson);
      if (singleBytes > HIVE_CUSTOM_OP_DATA_MAX_LENGTH) {
        throw new Error(
          `Single ODL event exceeds Hive custom_json limit (${HIVE_CUSTOM_OP_DATA_MAX_LENGTH} bytes)`,
        );
      }
      continue;
    }

    throw new Error(
      `Single ODL event exceeds Hive custom_json limit (${HIVE_CUSTOM_OP_DATA_MAX_LENGTH} bytes)`,
    );
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  const ops = chunks.map((chunkEvents) =>
    buildCustomJsonOpFromEvents(input, chunkEvents),
  );

  if (ops.length > OBJECT_CREATE_MAX_OPS_PER_TRX) {
    throw new Error(
      `Object create requires ${ops.length} custom_json operations; maximum is ${OBJECT_CREATE_MAX_OPS_PER_TRX} per transaction`,
    );
  }

  return ops;
}
