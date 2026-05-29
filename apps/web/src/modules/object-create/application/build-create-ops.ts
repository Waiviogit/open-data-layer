import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import {
  buildCustomJsonOp,
  HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
  type CustomJsonOp,
  type OdlUpdateCreateValueKind,
} from '@opden-data-layer/hive-broadcast';

import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';

import { groupFieldsByPriority } from '../domain/group-fields-by-priority';
import { isEntryValid } from '../domain/object-health-score';
import type { FieldEntry } from '../domain/object-create.types';

export const OBJECT_CREATE_MAX_OPS_PER_TRX = 5;

export type OdlCreateEvent = {
  action: 'object_create' | 'update_create';
  v: 1;
  payload: Record<string, unknown>;
};

function resolveValueFieldKey(valueKind: OdlUpdateCreateValueKind): string {
  if (valueKind === 'object_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

function buildUpdateCreateEventPayload(
  objectId: string,
  creator: string,
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
    creator,
    [valueField]: parsed.value,
  };
  if (definition.localizable && entry.locale) {
    payload['locale'] = entry.locale;
  }
  return payload;
}

export type BuildCreateOpsInput = {
  objectId: string;
  objectType: string;
  creator: string;
  odlCustomJsonId: string;
  fields: readonly FieldEntry[];
  language: string;
};

function jsonByteLength(json: string): number {
  return new TextEncoder().encode(json).length;
}

function serializeEnvelope(events: readonly OdlCreateEvent[]): string {
  return JSON.stringify({ events });
}

/**
 * Builds all ODL create events (`object_create` + `update_create`) for publish.
 */
export function buildAllCreateEvents(input: BuildCreateOpsInput): OdlCreateEvent[] {
  const events: OdlCreateEvent[] = [
    {
      action: 'object_create',
      v: 1,
      payload: {
        object_id: input.objectId,
        object_type: input.objectType,
        creator: input.creator,
      },
    },
  ];

  for (const entry of input.fields) {
    const locale =
      entry.locale && entry.locale.length > 0 ? entry.locale : input.language;
    const payload = buildUpdateCreateEventPayload(input.objectId, input.creator, {
      ...entry,
      locale,
    });
    if (payload) {
      events.push({
        action: 'update_create',
        v: 1,
        payload,
      });
    }
  }

  const requiredTypes = groupFieldsByPriority(input.objectType).required;
  for (const updateType of requiredTypes) {
    const hasValidEntry = input.fields.some(
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

function buildCustomJsonOpFromEvents(
  input: BuildCreateOpsInput,
  events: readonly OdlCreateEvent[],
): CustomJsonOp {
  return buildCustomJsonOp({
    required_auths: [],
    required_posting_auths: [input.creator],
    id: input.odlCustomJsonId,
    json: serializeEnvelope(events),
  });
}

/**
 * Splits create events into one or more Hive `custom_json` ops (≤ 8 192 bytes each, max 5 per trx).
 */
export function buildCreateOps(input: BuildCreateOpsInput): CustomJsonOp[] {
  const events = buildAllCreateEvents(input);
  const chunks: OdlCreateEvent[][] = [];
  let current: OdlCreateEvent[] = [];

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
