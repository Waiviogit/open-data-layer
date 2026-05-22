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

export type BuildOdlRankVoteOpInput = {
  readonly id: string;
  readonly updateId: string;
  readonly objectId: string;
  readonly voter: string;
  /** ODL rank 0–10000 (half-star step = 1000). */
  readonly rank: number;
  readonly rankContext?: string;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `rank_vote` event for an `aggregateRating` update.
 */
export type BuildOdlUpdateCreateWithRankVoteOpInput = {
  readonly id: string;
  readonly objectId: string;
  /** Dimension label stored as `value_text` on the new `aggregateRating` update. */
  readonly valueText: string;
  readonly creator: string;
  /** ODL rank 0–10000 (half-star step = 1000). */
  readonly rank: number;
  readonly rankContext?: string;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * One `custom_json` op: `update_create` (aggregateRating) then `rank_vote` in the same Hive transaction.
 * Create event carries `event_id`; rank vote references it via `create_event_id`.
 */
export function buildOdlUpdateCreateWithRankVoteOp(
  input: BuildOdlUpdateCreateWithRankVoteOpInput,
): CustomJsonOp {
  const eventId = crypto.randomUUID();
  const postingAuths = input.required_posting_auths ?? [input.creator];

  const envelope = {
    events: [
      {
        action: 'update_create' as const,
        v: 1,
        event_id: eventId,
        payload: {
          object_id: input.objectId,
          update_type: 'aggregateRating',
          creator: input.creator,
          value_text: input.valueText,
        },
      },
      {
        action: 'rank_vote' as const,
        v: 1,
        payload: {
          create_event_id: eventId,
          object_id: input.objectId,
          voter: input.creator,
          rank: input.rank,
          rank_context: input.rankContext ?? 'default',
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

export function buildOdlRankVoteOp(input: BuildOdlRankVoteOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: 'rank_vote' as const,
        v: 1,
        payload: {
          update_id: input.updateId,
          object_id: input.objectId,
          voter: input.voter,
          rank: input.rank,
          rank_context: input.rankContext ?? 'default',
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

export type OdlAuthorityType = 'administrative' | 'ownership';
export type OdlAuthorityMethod = 'add' | 'remove';

export type BuildOdlObjectAuthorityOpInput = {
  readonly id: string;
  readonly objectId: string;
  readonly authorityType: OdlAuthorityType;
  readonly method: OdlAuthorityMethod;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `object_authority` event (grant or revoke).
 */
export function buildOdlObjectAuthorityOp(input: BuildOdlObjectAuthorityOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: 'object_authority' as const,
        v: 1,
        payload: {
          object_id: input.objectId,
          authority_type: input.authorityType,
          method: input.method,
        },
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

export type OdlFollowMethod = 'follow' | 'unfollow' | 'bell';

export type BuildOdlObjectFollowOpInput = {
  readonly id: string;
  readonly objectId: string;
  readonly method: OdlFollowMethod;
  readonly bell?: boolean;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `object_follow` event.
 */
export type BuildOdlUserFollowBellOpInput = {
  readonly id: string;
  readonly following: string;
  readonly bell: boolean;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
};

/**
 * Builds a Hive `custom_json` op with one `user_follow` event (bell toggle only).
 */
export function buildOdlUserFollowBellOp(input: BuildOdlUserFollowBellOpInput): CustomJsonOp {
  const envelope = {
    events: [
      {
        action: 'user_follow' as const,
        v: 1,
        payload: {
          following: input.following,
          method: 'bell' as const,
          bell: input.bell,
        },
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

export function buildOdlObjectFollowOp(input: BuildOdlObjectFollowOpInput): CustomJsonOp {
  const payload: Record<string, unknown> = {
    object_id: input.objectId,
    method: input.method,
  };
  if (input.method === 'bell' && input.bell !== undefined) {
    payload['bell'] = input.bell;
  }

  const envelope = {
    events: [
      {
        action: 'object_follow' as const,
        v: 1,
        payload,
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
