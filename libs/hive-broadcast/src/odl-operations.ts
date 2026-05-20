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
  /** Client-generated id stored on the update row; defaults to `crypto.randomUUID()`. */
  readonly transactionId?: string;
};

function resolveValueFieldKey(valueKind: OdlUpdateCreateValueKind): string {
  if (valueKind === 'object_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

/** ODL event index of `update_create` in the add-update modal like flow. */
export const ODL_UPDATE_CREATE_EVENT_INDEX = 0;

function buildUpdateCreatePayload(
  input: BuildOdlUpdateCreateOpInput,
  transaction_id: string,
): Record<string, unknown> {
  const valueField = resolveValueFieldKey(input.valueKind);
  const payload: Record<string, unknown> = {
    object_id: input.objectId,
    update_type: input.updateType,
    creator: input.creator,
    transaction_id,
    [valueField]: input.value,
  };
  if (input.locale !== undefined && input.locale !== '') {
    payload['locale'] = input.locale;
  }
  return payload;
}

/** Matches chain-indexer `update_id` = `{trxId}-{trxIdx}-{opIdx}-{odlEventIdx}`. */
export function deriveOdlUpdateId(
  hiveTransactionId: string,
  odlEventIndex: number,
  transactionIndex = 0,
  operationIndex = 0,
): string {
  return `${hiveTransactionId}-${transactionIndex}-${operationIndex}-${odlEventIndex}`;
}

/**
 * Builds a Hive `custom_json` op with an ODL envelope containing one `update_create` event.
 */
export function buildOdlUpdateCreateOp(input: BuildOdlUpdateCreateOpInput): CustomJsonOp {
  const transaction_id = input.transactionId ?? crypto.randomUUID();
  const envelope = {
    events: [
      {
        action: 'update_create' as const,
        v: 1,
        payload: buildUpdateCreatePayload(input, transaction_id),
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
 * Vote uses `create_odl_event_index` so the indexer resolves the new row's `update_id`.
 */
export function buildOdlUpdateCreateWithLikeOp(
  input: BuildOdlUpdateCreateOpInput,
): CustomJsonOp {
  const createTransactionId = input.transactionId ?? crypto.randomUUID();
  const voteTransactionId = crypto.randomUUID();
  const postingAuths = input.required_posting_auths ?? [input.creator];

  const envelope = {
    events: [
      {
        action: 'update_create' as const,
        v: 1,
        payload: buildUpdateCreatePayload(input, createTransactionId),
      },
      {
        action: 'update_vote' as const,
        v: 1,
        payload: {
          create_odl_event_index: ODL_UPDATE_CREATE_EVENT_INDEX,
          object_id: input.objectId,
          voter: input.creator,
          vote: 'for',
          transaction_id: voteTransactionId,
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
