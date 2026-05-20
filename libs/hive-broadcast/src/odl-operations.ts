import { buildCustomJsonOp } from './operation-builders';
import type { CustomJsonOp } from './hive-operations';

export type OdlUpdateCreateValueKind = 'text' | 'geo' | 'json' | 'object_ref';

export type BuildOdlUpdateCreateOpInput = {
  /** Hive `custom_json` id (e.g. `odl-mainnet`). */
  readonly id: string;
  readonly objectId: string;
  readonly updateType: string;
  readonly creator: string;
  readonly valueKind: OdlUpdateCreateValueKind;
  readonly value: unknown;
  readonly locale?: string;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

function resolveValueFieldKey(valueKind: OdlUpdateCreateValueKind): string {
  if (valueKind === 'object_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

function buildUpdateCreatePayload(input: BuildOdlUpdateCreateOpInput): Record<string, unknown> {
  const valueField = resolveValueFieldKey(input.valueKind);
  const payload: Record<string, unknown> = {
    object_id: input.objectId,
    update_type: input.updateType,
    creator: input.creator,
    [valueField]: input.value,
  };
  if (input.locale !== undefined && input.locale !== '') {
    payload['locale'] = input.locale;
  }
  return payload;
}

/**
 * Builds a Hive `custom_json` op with an ODL envelope containing one `update_create` event.
 */
export function buildOdlUpdateCreateOp(input: BuildOdlUpdateCreateOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: 'update_create' as const,
        v: 1,
        payload: buildUpdateCreatePayload(input),
      },
    ],
  };

  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [],
    id: input.id,
    json: JSON.stringify(envelope),
  });
}

/**
 * One `custom_json` op: `update_create` then `update_vote` (like) in the same Hive transaction.
 * Create event carries `event_id`; vote references it via `create_event_id`.
 */
export function buildOdlUpdateCreateWithLikeOp(
  input: BuildOdlUpdateCreateOpInput,
): CustomJsonOp {
  const eventId = crypto.randomUUID();
  const postingAuths = input.required_posting_auths ?? [input.creator];

  const envelope = {
    events: [
      {
        action: 'update_create' as const,
        v: 1,
        event_id: eventId,
        payload: buildUpdateCreatePayload(input),
      },
      {
        action: 'update_vote' as const,
        v: 1,
        payload: {
          create_event_id: eventId,
          object_id: input.objectId,
          voter: input.creator,
          vote: 'for',
        },
      },
    ],
  };

  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: postingAuths,
    id: input.id,
    json: JSON.stringify(envelope),
  });
}

export type OdlUpdateVoteValue = 'for' | 'against' | 'remove';

export type BuildOdlUpdateVoteOpInput = {
  readonly id: string;
  readonly updateId: string;
  readonly objectId: string;
  readonly voter: string;
  readonly vote: OdlUpdateVoteValue;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `update_vote` event (existing `update_id`).
 */
export function buildOdlUpdateVoteOp(input: BuildOdlUpdateVoteOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: 'update_vote' as const,
        v: 1,
        payload: {
          update_id: input.updateId,
          object_id: input.objectId,
          voter: input.voter,
          vote: input.vote,
        },
      },
    ],
  };

  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [input.voter],
    id: input.id,
    json: JSON.stringify(envelope),
  });
}
