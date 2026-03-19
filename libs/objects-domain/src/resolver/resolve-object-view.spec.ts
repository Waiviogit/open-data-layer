import type { ObjectsCore, ObjectUpdate, ValidityVote, RankVote, ObjectAuthority } from '@opden-data-layer/core';
import type { AggregatedObject, VoterReputationMap } from '../types/aggregated-object';
import type { ResolveOptions } from '../types/resolve-options';
import { DEFAULT_GOVERNANCE_SNAPSHOT } from '../types/governance-snapshot';
import { resolveObjectViews } from './resolve-object-view';

function makeCore(objectId: string, creator = 'alice'): ObjectsCore {
  return {
    object_id: objectId,
    object_type: 'place',
    creator,
    weight: null,
    meta_group_id: null,
    transaction_id: 'tx1',
    seq: 1,
  };
}

function makeUpdate(
  updateId: string,
  objectId: string,
  updateType: string,
  creator = 'alice',
  eventSeq = BigInt(1),
): ObjectUpdate {
  return {
    update_id: updateId,
    object_id: objectId,
    update_type: updateType,
    creator,
    created_at_unix: 1000,
    event_seq: eventSeq,
    transaction_id: 'tx1',
    value_text: `value-${updateId}`,
    value_geo: null,
    value_json: null,
    value_text_normalized: `value-${updateId}`,
    search_vector: null,
  };
}

function makeAggregated(
  objectId: string,
  updates: ObjectUpdate[],
  validityVotes: ValidityVote[] = [],
  rankVotes: RankVote[] = [],
  authorities: ObjectAuthority[] = [],
  creator = 'alice',
): AggregatedObject {
  return {
    core: makeCore(objectId, creator),
    updates,
    validity_votes: validityVotes,
    rank_votes: rankVotes,
    authorities,
  };
}

function makeOptions(
  updateTypes: string[],
  overrides: Partial<ResolveOptions> = {},
): ResolveOptions {
  return {
    locale: 'en-US',
    update_types: updateTypes,
    governance: DEFAULT_GOVERNANCE_SNAPSHOT,
    include_rejected: false,
    ...overrides,
  };
}

const EMPTY_REPUTATION: VoterReputationMap = new Map();

describe('resolveObjectViews', () => {
  it('returns empty array for empty input', () => {
    expect(resolveObjectViews([], EMPTY_REPUTATION, makeOptions(['name']))).toEqual([]);
  });

  it('skips objects whose creator is banned', () => {
    const governance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, banned: ['banned_creator'] };
    const obj = makeAggregated('obj1', [], [], [], [], 'banned_creator');
    const result = resolveObjectViews([obj], EMPTY_REPUTATION, makeOptions(['name'], { governance }));
    expect(result).toHaveLength(0);
  });

  it('filters updates not matching requested update_types', () => {
    const updates = [
      makeUpdate('u1', 'obj1', 'name'),
      makeUpdate('u2', 'obj1', 'description'),
    ];
    const obj = makeAggregated('obj1', updates);
    const result = resolveObjectViews([obj], EMPTY_REPUTATION, makeOptions(['name']));
    expect(result).toHaveLength(1);
    expect(result[0].fields).toHaveProperty('name');
    expect(result[0].fields).not.toHaveProperty('description');
  });

  it('filters updates by banned creator', () => {
    const governance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, banned: ['bad_actor'] };
    const updates = [
      makeUpdate('u1', 'obj1', 'name', 'alice'),
      makeUpdate('u2', 'obj1', 'name', 'bad_actor'),
    ];
    const obj = makeAggregated('obj1', updates);
    const result = resolveObjectViews([obj], EMPTY_REPUTATION, makeOptions(['name'], { governance }));
    const nameField = result[0].fields['name'];
    expect(nameField.values.every((v) => v.creator !== 'bad_actor')).toBe(true);
  });

  it('by default omits REJECTED updates (include_rejected=false)', () => {
    const governance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['admin1'] };
    const update = makeUpdate('u1', 'obj1', 'name');
    const voteAgainst: ValidityVote = {
      update_id: 'u1',
      object_id: 'obj1',
      voter: 'admin1',
      vote: 'against',
      event_seq: BigInt(10),
      transaction_id: 'tx-vote',
    };
    const obj = makeAggregated('obj1', [update], [voteAgainst]);
    const result = resolveObjectViews([obj], EMPTY_REPUTATION, makeOptions(['name'], { governance }));
    const nameField = result[0].fields['name'];
    expect(nameField.values).toHaveLength(0);
  });

  it('includes REJECTED updates when include_rejected=true', () => {
    const governance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['admin1'] };
    const update = makeUpdate('u1', 'obj1', 'name');
    const voteAgainst: ValidityVote = {
      update_id: 'u1',
      object_id: 'obj1',
      voter: 'admin1',
      vote: 'against',
      event_seq: BigInt(10),
      transaction_id: 'tx-vote',
    };
    const obj = makeAggregated('obj1', [update], [voteAgainst]);
    const result = resolveObjectViews(
      [obj],
      EMPTY_REPUTATION,
      makeOptions(['name'], { governance, include_rejected: true }),
    );
    const nameField = result[0].fields['name'];
    expect(nameField.values).toHaveLength(1);
    expect(nameField.values[0].validity_status).toBe('REJECTED');
  });

  it('VALID updates appear before REJECTED when include_rejected=true', () => {
    const governance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['admin1'] };
    // u1 = REJECTED by admin, u2 = not voted = VALID
    const updates = [
      makeUpdate('u1', 'obj1', 'tag', 'alice', BigInt(1)),
      makeUpdate('u2', 'obj1', 'tag', 'alice', BigInt(2)),
    ];
    const voteAgainst: ValidityVote = {
      update_id: 'u1',
      object_id: 'obj1',
      voter: 'admin1',
      vote: 'against',
      event_seq: BigInt(10),
      transaction_id: 'tx-vote',
    };
    const obj = makeAggregated('obj1', updates, [voteAgainst]);
    const result = resolveObjectViews(
      [obj],
      EMPTY_REPUTATION,
      makeOptions(['tag'], { governance, include_rejected: true }),
    );
    const tagField = result[0].fields['tag'];
    expect(tagField.values).toHaveLength(2);
    expect(tagField.values[0].validity_status).toBe('VALID');
    expect(tagField.values[1].validity_status).toBe('REJECTED');
  });

  it('assembles basic ResolvedObjectView shape correctly', () => {
    const update = makeUpdate('u1', 'obj1', 'name');
    const obj = makeAggregated('obj1', [update]);
    const [view] = resolveObjectViews([obj], EMPTY_REPUTATION, makeOptions(['name']));
    expect(view.object_id).toBe('obj1');
    expect(view.object_type).toBe('place');
    expect(view.creator).toBe('alice');
    expect(view.fields['name'].cardinality).toBe('single');
    expect(view.fields['name'].values[0].update_id).toBe('u1');
  });
});
