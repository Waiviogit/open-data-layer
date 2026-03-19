import type { ObjectUpdate, ValidityVote, ObjectAuthority } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { VoterReputationMap } from '../types/aggregated-object';
import { computeCuratorSet, resolveUpdateValidity } from './resolve-validity';

const BASE_UPDATE: ObjectUpdate = {
  update_id: 'u1',
  object_id: 'obj1',
  update_type: 'name',
  creator: 'alice',
  created_at_unix: 1000,
  event_seq: BigInt(1),
  transaction_id: 'tx1',
  value_text: 'Alice Place',
  value_geo: null,
  value_json: null,
  value_text_normalized: 'alice place',
  search_vector: null,
};

const EMPTY_GOVERNANCE: GovernanceSnapshot = {
  admins: [],
  trusted: [],
  moderators: [],
  validity_cutoff: [],
  restricted: [],
  whitelist: [],
  authorities: [],
  banned: [],
  object_control: null,
  muted: [],
  inherits_from: [],
};

function makeVote(
  voter: string,
  vote: 'for' | 'against',
  eventSeq = BigInt(10),
): ValidityVote {
  return {
    update_id: 'u1',
    object_id: 'obj1',
    voter,
    vote,
    event_seq: eventSeq,
    transaction_id: 'tx-vote',
  };
}

function makeAuthority(
  account: string,
  type: 'ownership' | 'administrative',
): ObjectAuthority {
  return { object_id: 'obj1', account, authority_type: type };
}

describe('computeCuratorSet', () => {
  it('returns empty set when no authorities exist', () => {
    const C = computeCuratorSet([], EMPTY_GOVERNANCE);
    expect(C.size).toBe(0);
  });

  it('returns empty set when ownership holders are not in admins or trusted', () => {
    const authorities = [makeAuthority('bob', 'ownership')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const C = computeCuratorSet(authorities, governance);
    expect(C.size).toBe(0);
  });

  it('includes ownership holder who is in admins', () => {
    const authorities = [makeAuthority('admin1', 'ownership')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const C = computeCuratorSet(authorities, governance);
    expect(C.has('admin1')).toBe(true);
  });

  it('includes ownership holder who is in trusted', () => {
    const authorities = [makeAuthority('trusted1', 'ownership')];
    const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const C = computeCuratorSet(authorities, governance);
    expect(C.has('trusted1')).toBe(true);
  });

  it('with object_control=full: includes governance.admins union ownership holders', () => {
    const authorities = [makeAuthority('bob', 'ownership')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'], object_control: 'full' as const };
    const C = computeCuratorSet(authorities, governance);
    expect(C.has('admin1')).toBe(true);
    expect(C.has('bob')).toBe(true);
  });
});

describe('resolveUpdateValidity — curator filter', () => {
  const curatorSet = new Set(['curator1']);
  const governance = { ...EMPTY_GOVERNANCE, admins: ['curator1'] };
  const authorities = [makeAuthority('curator1', 'ownership')];
  const voterReputations: VoterReputationMap = new Map();

  it('is VALID when update creator is in curator set', () => {
    const update = { ...BASE_UPDATE, creator: 'curator1' };
    const result = resolveUpdateValidity(update, [], curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
  });

  it('is VALID when a curator member voted for', () => {
    const votes = [makeVote('curator1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
  });

  it('is REJECTED when creator not in C and no curator voted for', () => {
    const result = resolveUpdateValidity(BASE_UPDATE, [], curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
  });
});

describe('resolveUpdateValidity — admin decisive (LWAW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterReputationMap = new Map();
  const authorities: ObjectAuthority[] = [];

  it('VALID when admin voted for', () => {
    const votes = [makeVote('admin1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
  });

  it('REJECTED when admin voted against', () => {
    const votes = [makeVote('admin1', 'against')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
  });

  it('latest admin vote wins (LWAW)', () => {
    const votes = [
      makeVote('admin1', 'for', BigInt(5)),
      makeVote('admin1', 'against', BigInt(10)),
    ];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
  });
});

describe('resolveUpdateValidity — trusted decisive (LWTW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterReputationMap = new Map();

  it('VALID when trusted has authority on object and voted for', () => {
    const authorities = [makeAuthority('trusted1', 'ownership')];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
  });

  it('falls through to community when trusted has no authority on object', () => {
    const authorities: ObjectAuthority[] = [];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    // No authority on object → trusted vote is not decisive → no community votes → VALID baseline
    expect(result.status).toBe('VALID');
  });
});

describe('resolveUpdateValidity — community vote weight', () => {
  const governance = EMPTY_GOVERNANCE;
  const emptySet = new Set<string>();
  const authorities: ObjectAuthority[] = [];

  it('baseline VALID when no votes exist', () => {
    const result = resolveUpdateValidity(BASE_UPDATE, [], emptySet, governance, new Map(), authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
  });

  it('VALID when field_weight >= 0', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'for')];
    const reputations: VoterReputationMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeGreaterThanOrEqual(0);
  });

  it('REJECTED when field_weight < 0', () => {
    const votes = [makeVote('voter1', 'against'), makeVote('voter2', 'against')];
    const reputations: VoterReputationMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.status).toBe('REJECTED');
    expect(result.field_weight).toBeLessThan(0);
  });

  it('applies log2 vote power scaling', () => {
    // voter with reputation=3 has votePower = 1 + log2(1+3) = 3
    const votes = [
      makeVote('power_voter', 'for'),    // votePower=3
      makeVote('weak_voter', 'against'), // votePower=1
    ];
    const reputations: VoterReputationMap = new Map([['power_voter', 3], ['weak_voter', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.status).toBe('VALID');
    // field_weight = 3 - 1 = 2 > 0
    expect(result.field_weight).toBeCloseTo(2, 5);
  });
});
