import type { ObjectUpdate, ValidityVote, ObjectAuthority } from '@opden-data-layer/core';
import { MIN_PERCENT_TO_SHOW_UPDATE } from '../constants';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { VoterWaivPowerMap } from '../types/aggregated-object';
import {
  computeApprovePercent,
  computeCuratorSet,
  resolveUpdateValidity,
} from './resolve-validity';

const BASE_UPDATE: ObjectUpdate = {
  update_id: 'u1',
  object_id: 'obj1',
  update_type: 'name',
  creator: 'alice',
  locale: null,
  created_at_unix: 1000,
  event_seq: BigInt(1),
  transaction_id: 'tx1',
  value_text: 'Alice Place',
  value_geo: null,
  value_json: null,
  value_text_normalized: 'alice place',
  search_vector: null,
  rank_score: null,
  rank_context: null,
  rank_decisive_event_seq: null,
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
  return { object_id: 'obj1', account, authority_type: type, created_at: new Date() };
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
  const voterReputations: VoterWaivPowerMap = new Map();

  it('is VALID when update creator is in curator set', () => {
    const update = { ...BASE_UPDATE, creator: 'curator1' };
    const result = resolveUpdateValidity(update, [], curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('is VALID when a curator member voted for', () => {
    const votes = [makeVote('curator1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('is REJECTED when creator not in C and no curator voted for', () => {
    const result = resolveUpdateValidity(BASE_UPDATE, [], curatorSet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
  });
});

describe('resolveUpdateValidity — admin decisive (LWAW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterWaivPowerMap = new Map();
  const authorities: ObjectAuthority[] = [];

  it('VALID when admin voted for', () => {
    const votes = [makeVote('admin1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
  });

  it('REJECTED when admin voted against', () => {
    const votes = [makeVote('admin1', 'against')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
  });

  it('latest admin vote wins (LWAW)', () => {
    const votes = [
      makeVote('admin1', 'for', BigInt(5)),
      makeVote('admin1', 'against', BigInt(10)),
    ];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
  });
});

describe('resolveUpdateValidity — trusted decisive (LWTW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterWaivPowerMap = new Map();

  it('VALID when trusted has authority on object and voted for', () => {
    const authorities = [makeAuthority('trusted1', 'ownership')];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('trusted');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
  });

  it('falls through to community when trusted has no authority on object', () => {
    const authorities: ObjectAuthority[] = [];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, authorities);
    // No authority on object → trusted vote is not decisive → no community votes → VALID baseline
    expect(result.status).toBe('VALID');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('baseline');
    expect(result.decisive_vote_event_seq).toBeNull();
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
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('baseline');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('VALID when only community for votes (approve_percent 100)', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'for')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeGreaterThanOrEqual(0);
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('REJECTED when only community against votes', () => {
    const votes = [makeVote('voter1', 'against'), makeVote('voter2', 'against')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.status).toBe('REJECTED');
    expect(result.field_weight).toBeLessThan(0);
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('REJECTED when equal for and against weight (net 0)', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'against')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.field_weight).toBe(0);
    expect(result.approve_percent).toBe(0);
    expect(result.status).toBe('REJECTED');
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('REJECTED when mixed community approve_percent is exactly MIN (strict >)', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'against')];
    const reputations: VoterWaivPowerMap = new Map([
      ['voter1', 7],
      ['voter2', 3],
    ]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.approve_percent).toBe(70);
    expect(result.approve_percent > MIN_PERCENT_TO_SHOW_UPDATE).toBe(false);
    expect(result.status).toBe('REJECTED');
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('VALID when mixed community approve_percent exceeds MIN', () => {
    const votes = [
      makeVote('power_voter', 'for'),
      makeVote('weak_voter', 'against'),
    ];
    const reputations: VoterWaivPowerMap = new Map([['power_voter', 3], ['weak_voter', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(result.approve_percent).toBe(75);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBe(2);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });
});

describe('computeApprovePercent', () => {
  const emptySet = new Set<string>();
  const authorities: ObjectAuthority[] = [];
  const governance = EMPTY_GOVERNANCE;

  it('returns 100 when there are no votes', () => {
    expect(
      computeApprovePercent(BASE_UPDATE, [], governance, new Map(), authorities),
    ).toBe(100);
  });

  it('returns 100 / 0 for latest admin for / against', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('admin1', 'for')], gov, new Map(), authorities),
    ).toBe(100);
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('admin1', 'against')], gov, new Map(), authorities),
    ).toBe(0);
  });

  it('returns 100 / 0 for trusted with authority for / against', () => {
    const gov = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const auth = [makeAuthority('trusted1', 'ownership')];
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('trusted1', 'for')], gov, new Map(), auth),
    ).toBe(100);
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('trusted1', 'against')], gov, new Map(), auth),
    ).toBe(0);
  });

  it('returns 100 when only community for votes', () => {
    const votes = [makeVote('a', 'for'), makeVote('b', 'for')];
    expect(
      computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0], ['b', 0]]), authorities),
    ).toBe(100);
  });

  it('returns 0 when only community against votes', () => {
    const votes = [makeVote('a', 'against')];
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0]]), authorities)).toBe(0);
  });

  it('returns 0 when equal for and against weight', () => {
    const votes = [makeVote('a', 'for'), makeVote('b', 'against')];
    expect(
      computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0], ['b', 0]]), authorities),
    ).toBe(0);
  });

  it('returns 80 when for_weight 4 and against_weight 1', () => {
    const votes2 = [
      makeVote('v1', 'for'),
      makeVote('v2', 'for'),
      makeVote('v3', 'for'),
      makeVote('v4', 'for'),
      makeVote('v5', 'against'),
    ];
    const m = new Map<string, number>([
      ['v1', 1],
      ['v2', 1],
      ['v3', 1],
      ['v4', 1],
      ['v5', 1],
    ]);
    expect(computeApprovePercent(BASE_UPDATE, votes2, governance, m, authorities)).toBe(80);
  });

  it('returns 70 when for_weight 7 and against_weight 3', () => {
    const votes = [makeVote('v1', 'for'), makeVote('v2', 'against')];
    const m = new Map<string, number>([
      ['v1', 7],
      ['v2', 3],
    ]);
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, m, authorities)).toBe(70);
  });

  it('returns 66.667 when for_weight 2 and against_weight 1', () => {
    const votes = [makeVote('v1', 'for'), makeVote('v2', 'against')];
    const m = new Map<string, number>([
      ['v1', 2],
      ['v2', 1],
    ]);
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, m, authorities)).toBe(66.667);
  });

  it('ignores update when filtering by update_id', () => {
    const otherVote: ValidityVote = {
      ...makeVote('someone', 'against'),
      update_id: 'other',
    };
    expect(
      computeApprovePercent(BASE_UPDATE, [otherVote], governance, new Map(), authorities),
    ).toBe(100);
  });

  it('matches resolveUpdateValidity community branch approve_percent', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'against')];
    const reputations = new Map([
      ['voter1', 7],
      ['voter2', 3],
    ]);
    const p = computeApprovePercent(BASE_UPDATE, votes, governance, reputations, authorities);
    const r = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, authorities);
    expect(r.approve_percent).toBe(p);
  });
});
