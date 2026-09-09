import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import type { OdlUpdateCreateValueKind } from './odl-operations';
import { HIVE_CUSTOM_OP_DATA_MAX_LENGTH } from './constants';
import { buildCustomJsonOp } from './operation-builders';
import type { CustomJsonOp } from './hive-operations';

export const OBJECT_CREATE_MAX_OPS_PER_TRX = 5;

export type OdlCreateEvent = {
  action: 'object_create' | 'update_create';
  v: 1;
  payload: Record<string, unknown>;
};

export type AgentObjectCreateField = {
  updateType: string;
  value: unknown;
  locale?: string;
};

export type BuildObjectCreateEnvelopeInput = {
  objectType: string;
  objectId: string;
  creator: string;
  id: string;
  fields: readonly AgentObjectCreateField[];
  language?: string;
};

export type BuildObjectCreateEnvelopeResult = {
  events: OdlCreateEvent[];
  ops: CustomJsonOp[];
  warnings: string[];
  /** True when events must be uploaded via IPFS batch_import instead of direct ops. */
  requiresIpfsBatch: boolean;
};

/** Full ODL envelope JSON for IPFS batch import. */
export function buildOdlEnvelopeJson(events: readonly OdlCreateEvent[]): string {
  return serializeEnvelope(events);
}

export function resolveOdlValueFieldKey(
  valueKind: OdlUpdateCreateValueKind,
): string {
  if (valueKind === 'object_ref' || valueKind === 'user_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

function serializeEnvelope(events: readonly OdlCreateEvent[]): string {
  return JSON.stringify({ events });
}

function jsonByteLength(json: string): number {
  return new TextEncoder().encode(json).length;
}

function buildCustomJsonOpFromEvents(
  creator: string,
  id: string,
  events: readonly OdlCreateEvent[],
): CustomJsonOp {
  return buildCustomJsonOp({
    required_auths: [],
    required_posting_auths: [creator],
    id,
    json: serializeEnvelope(events),
  });
}

export function chunkOdlEventsIntoOps(input: {
  events: readonly OdlCreateEvent[];
  creator: string;
  id: string;
}): CustomJsonOp[] {
  const chunks: OdlCreateEvent[][] = [];
  let current: OdlCreateEvent[] = [];

  for (const event of input.events) {
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
    buildCustomJsonOpFromEvents(input.creator, input.id, chunkEvents),
  );

  if (ops.length > OBJECT_CREATE_MAX_OPS_PER_TRX) {
    throw new Error(
      `Object create requires ${ops.length} custom_json operations; maximum is ${OBJECT_CREATE_MAX_OPS_PER_TRX} per transaction`,
    );
  }

  return ops;
}

export function buildObjectCreateEnvelope(
  input: BuildObjectCreateEnvelopeInput,
): BuildObjectCreateEnvelopeResult {
  const objectTypeDef = OBJECT_TYPE_REGISTRY[input.objectType];
  if (!objectTypeDef) {
    throw new Error(`Unknown object_type: ${input.objectType}`);
  }

  const warnings: string[] = [];
  const language = input.language ?? 'en-US';
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

  for (const field of input.fields) {
    if (!objectTypeDef.supported_updates.includes(field.updateType)) {
      warnings.push(
        `Skipped unsupported update "${field.updateType}" for object_type "${input.objectType}"`,
      );
      continue;
    }

    const definition = UPDATE_REGISTRY[field.updateType];
    if (!definition) {
      throw new Error(`Unknown update_type: ${field.updateType}`);
    }

    const parsed = definition.schema.safeParse(field.value);
    if (!parsed.success) {
      throw new Error(
        `Invalid value for update_type "${field.updateType}": ${parsed.error.message}`,
      );
    }

    const valueField = resolveOdlValueFieldKey(definition.value_kind);
    const payload: Record<string, unknown> = {
      object_id: input.objectId,
      update_type: field.updateType,
      creator: input.creator,
      [valueField]: parsed.data,
    };

    if (definition.localizable === true) {
      payload['locale'] =
        field.locale && field.locale.length > 0 ? field.locale : language;
    }

    events.push({
      action: 'update_create',
      v: 1,
      payload,
    });
  }

  let ops: CustomJsonOp[] = [];
  let requiresIpfsBatch = false;
  try {
    ops = chunkOdlEventsIntoOps({
      events,
      creator: input.creator,
      id: input.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('exceeds Hive custom_json limit') ||
      message.includes('custom_json operations; maximum is')
    ) {
      requiresIpfsBatch = true;
    } else {
      throw err;
    }
  }

  return { events, ops, warnings, requiresIpfsBatch };
}

export function parseObjectIdFromCreateOdlJson(odlJson: string): string | null {
  try {
    const parsed = JSON.parse(odlJson) as {
      events?: Array<{ action?: string; payload?: { object_id?: string } }>;
    };
    const first = parsed.events?.[0];
    if (first?.action !== 'object_create') {
      return null;
    }
    const objectId = first.payload?.object_id?.trim();
    return objectId && objectId.length > 0 ? objectId : null;
  } catch {
    return null;
  }
}
