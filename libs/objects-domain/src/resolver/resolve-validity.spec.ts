import { MIN_PERCENT_TO_SHOW_UPDATE } from '../constants';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { VoterWaivPowerMap } from '../types/aggregated-object';
import type {
  ObjectUpdate,
  ValidityVote,
  ObjectOwnership,
} from '@opden-data-layer/odl-db-types';
import {
  computeApprovePercent,
  computeCuratorSet,
  computeExclusiveOwnerSet,
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
  authors: [],
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

function makeOwnership(
  account: string,
  ownership_type: 'exclusive' | 'supervised' = 'exclusive',
): ObjectOwnership {
  return {
    object_id: 'obj1',
    account,
    ownership_type,
    event_seq: BigInt(1),
    created_at: new Date(),
  };
}

describe('computeCuratorSet', () => {
  it('returns empty set when no ownerships exist', () => {
    const C = computeCuratorSet([], EMPTY_GOVERNANCE);
    expect(C.size).toBe(0);
  });

  it('returns empty set when ownership holders are not in admins or trusted', () => {
    const ownerships = [makeOwnership('bob')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.size).toBe(0);
  });

  it('includes ownership holder who is in admins', () => {
    const ownerships = [makeOwnership('admin1')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.has('admin1')).toBe(true);
  });

  it('includes ownership holder who is in trusted', () => {
    const ownerships = [makeOwnership('trusted1')];
    const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.has('trusted1')).toBe(true);
  });

  it('with object_control=full and no recognized exclusive: E is all admins', () => {
    const governance = {
      ...EMPTY_GOVERNANCE,
      admins: ['admin1', 'admin2'],
      object_control: 'full' as const,
    };
    const C = computeCuratorSet([], governance);
    expect(C.has('admin1')).toBe(true);
    expect(C.has('admin2')).toBe(true);
    expect(C.size).toBe(2);
  });

  it('with object_control=full and one exclusive admin: E is that admin only', () => {
    const ownerships = [makeOwnership('admin1')];
    const governance = {
      ...EMPTY_GOVERNANCE,
      admins: ['admin1', 'admin2'],
      object_control: 'full' as const,
    };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.has('admin1')).toBe(true);
    expect(C.has('admin2')).toBe(false);
    expect(C.size).toBe(1);
  });

  it('with object_control=full: unrecognized exclusive holder is not in E', () => {
    const ownerships = [makeOwnership('bob')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'], object_control: 'full' as const };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.has('admin1')).toBe(true);
    expect(C.has('bob')).toBe(false);
  });

  it('exclusive admin when other admin has supervised only', () => {
    const ownerships = [makeOwnership('admin1'), makeOwnership('admin2', 'supervised')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const C = computeExclusiveOwnerSet(ownerships, governance);
    expect(C.has('admin1')).toBe(true);
    expect(C.has('admin2')).toBe(false);
    expect(C.size).toBe(1);
  });

  it('excludes supervised ownership from exclusive owner set', () => {
    const ownerships = [makeOwnership('trusted1', 'supervised')];
    const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const C = computeCuratorSet(ownerships, governance);
    expect(C.size).toBe(0);
  });
});

describe('resolveUpdateValidity — curator filter', () => {
  const curatorSet = new Set(['curator1']);
  const governance = { ...EMPTY_GOVERNANCE, admins: ['curator1'] };
  const ownerships = [makeOwnership('curator1')];
  const voterReputations: VoterWaivPowerMap = new Map();

  it('is VALID when update creator is in curator set', () => {
    const update = { ...BASE_UPDATE, creator: 'curator1' };
    const result = resolveUpdateValidity(update, [], curatorSet, governance, voterReputations, ownerships);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
    expect(result.decisive_voter).toBeNull();
    expect(result.decisive_vote).toBeNull();
  });

  it('is VALID when a curator member voted for', () => {
    const votes = [makeVote('curator1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, curatorSet, governance, voterReputations, ownerships);
    expect(result.status).toBe('VALID');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('is REJECTED when creator not in C and no curator voted for', () => {
    const result = resolveUpdateValidity(BASE_UPDATE, [], curatorSet, governance, voterReputations, ownerships);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBeNull();
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('latest exclusive vote wins over creator membership in E', () => {
    const exclusiveSet = new Set(['owner1', 'owner2']);
    const update = { ...BASE_UPDATE, creator: 'owner1' };
    const votes = [
      makeVote('owner2', 'for', BigInt(5)),
      makeVote('owner2', 'against', BigInt(20)),
    ];
    const result = resolveUpdateValidity(
      update,
      votes,
      exclusiveSet,
      governance,
      voterReputations,
      [makeOwnership('owner1'), makeOwnership('owner2')],
    );
    expect(result.status).toBe('REJECTED');
  });

  it('non-exclusive admin vote does not validate when E is nonempty', () => {
    const ownerships = [makeOwnership('admin1')];
    const governanceMulti = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const curatorSet = computeExclusiveOwnerSet(ownerships, governanceMulti);
    const update = { ...BASE_UPDATE, creator: 'stranger' };
    const votes = [makeVote('admin2', 'for', BigInt(20))];
    const result = resolveUpdateValidity(
      update,
      votes,
      curatorSet,
      governanceMulti,
      voterReputations,
      ownerships,
    );
    expect(result.status).toBe('REJECTED');
  });

  it('exclusive-admin for stays VALID when non-exclusive admin votes against later', () => {
    const ownerships = [makeOwnership('admin1')];
    const governanceMulti = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const curatorSet = computeExclusiveOwnerSet(ownerships, governanceMulti);
    const update = { ...BASE_UPDATE, creator: 'stranger' };
    const votes = [
      makeVote('admin1', 'for', BigInt(10)),
      makeVote('admin2', 'against', BigInt(20)),
    ];
    const result = resolveUpdateValidity(
      update,
      votes,
      curatorSet,
      governanceMulti,
      voterReputations,
      ownerships,
    );
    expect(result.status).toBe('VALID');
  });

  it('second exclusive-admin against rejects after first exclusive for', () => {
    const ownerships = [makeOwnership('admin1'), makeOwnership('dave')];
    const governanceMulti = {
      ...EMPTY_GOVERNANCE,
      admins: ['admin1', 'admin2', 'dave'],
    };
    const curatorSet = computeExclusiveOwnerSet(ownerships, governanceMulti);
    const update = { ...BASE_UPDATE, creator: 'stranger' };
    const votes = [
      makeVote('admin1', 'for', BigInt(10)),
      makeVote('admin2', 'against', BigInt(20)),
      makeVote('dave', 'against', BigInt(30)),
    ];
    const result = resolveUpdateValidity(
      update,
      votes,
      curatorSet,
      governanceMulti,
      voterReputations,
      ownerships,
    );
    expect(result.status).toBe('REJECTED');
  });
});

describe('resolveUpdateValidity — admin decisive (LWAW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterWaivPowerMap = new Map();
  const ownerships: ObjectOwnership[] = [];

  it('VALID when admin voted for', () => {
    const votes = [makeVote('admin1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, ownerships);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
    expect(result.decisive_voter).toBe('admin1');
    expect(result.decisive_vote).toBe('for');
  });

  it('REJECTED when admin voted against', () => {
    const votes = [makeVote('admin1', 'against')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, ownerships);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
    expect(result.decisive_voter).toBe('admin1');
    expect(result.decisive_vote).toBe('against');
  });

  it('latest admin vote wins (LWAW)', () => {
    const votes = [
      makeVote('admin1', 'for', BigInt(5)),
      makeVote('admin1', 'against', BigInt(10)),
    ];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, ownerships);
    expect(result.status).toBe('REJECTED');
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
    expect(result.decisive_voter).toBe('admin1');
    expect(result.decisive_vote).toBe('against');
  });

  it('later admin among multiple admins wins by event_seq', () => {
    const governanceMulti = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const votes = [
      makeVote('admin1', 'for', BigInt(5)),
      makeVote('admin2', 'against', BigInt(20)),
    ];
    const result = resolveUpdateValidity(
      BASE_UPDATE,
      votes,
      emptySet,
      governanceMulti,
      voterReputations,
      ownerships,
    );
    expect(result.validity_tier).toBe('admin');
    expect(result.decisive_voter).toBe('admin2');
    expect(result.decisive_vote).toBe('against');
    expect(result.status).toBe('REJECTED');
  });
});

describe('resolveUpdateValidity — trusted decisive (LWTW)', () => {
  const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
  const emptySet = new Set<string>();
  const voterReputations: VoterWaivPowerMap = new Map();

  it('VALID when trusted has authority on object and voted for', () => {
    const ownerships = [makeOwnership('trusted1')];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, ownerships);
    expect(result.status).toBe('VALID');
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('trusted');
    expect(result.decisive_vote_event_seq).toBe(BigInt(10));
    expect(result.decisive_voter).toBe('trusted1');
    expect(result.decisive_vote).toBe('for');
  });

  it('falls through to community when trusted has no authority on object', () => {
    const ownerships: ObjectOwnership[] = [];
    const votes = [makeVote('trusted1', 'for')];
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, voterReputations, ownerships);
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
  const ownerships: ObjectOwnership[] = [];

  it('baseline VALID when no votes exist', () => {
    const result = resolveUpdateValidity(BASE_UPDATE, [], emptySet, governance, new Map(), ownerships);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeNull();
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('baseline');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('VALID when only community for votes (approve_percent 100)', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'for')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBeGreaterThanOrEqual(0);
    expect(result.approve_percent).toBe(100);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('REJECTED when only community against votes', () => {
    const votes = [makeVote('voter1', 'against'), makeVote('voter2', 'against')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
    expect(result.status).toBe('REJECTED');
    expect(result.field_weight).toBeLessThan(0);
    expect(result.approve_percent).toBe(0);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });

  it('REJECTED when equal for and against weight (net 0)', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'against')];
    const reputations: VoterWaivPowerMap = new Map([['voter1', 0], ['voter2', 0]]);
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
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
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
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
    const result = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
    expect(result.approve_percent).toBe(75);
    expect(result.status).toBe('VALID');
    expect(result.field_weight).toBe(2);
    expect(result.validity_tier).toBe('community');
    expect(result.decisive_vote_event_seq).toBeNull();
  });
});

describe('computeApprovePercent', () => {
  const emptySet = new Set<string>();
  const ownerships: ObjectOwnership[] = [];
  const governance = EMPTY_GOVERNANCE;

  it('returns 100 when there are no votes', () => {
    expect(
      computeApprovePercent(BASE_UPDATE, [], governance, new Map(), ownerships),
    ).toBe(100);
  });

  it('returns 100 / 0 for latest admin for / against', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('admin1', 'for')], gov, new Map(), ownerships),
    ).toBe(100);
    expect(
      computeApprovePercent(BASE_UPDATE, [makeVote('admin1', 'against')], gov, new Map(), ownerships),
    ).toBe(0);
  });

  it('exclusive-admin for yields 100 when non-exclusive admin votes against later', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const auth = [makeOwnership('admin1')];
    const votes = [
      makeVote('admin1', 'for', BigInt(10)),
      makeVote('admin2', 'against', BigInt(20)),
    ];
    expect(computeApprovePercent(BASE_UPDATE, votes, gov, new Map(), auth)).toBe(100);
  });

  it('second exclusive-admin against yields 0 after first exclusive for', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2', 'dave'] };
    const auth = [makeOwnership('admin1'), makeOwnership('dave')];
    const votes = [
      makeVote('admin1', 'for', BigInt(10)),
      makeVote('admin2', 'against', BigInt(20)),
      makeVote('dave', 'against', BigInt(30)),
    ];
    expect(computeApprovePercent(BASE_UPDATE, votes, gov, new Map(), auth)).toBe(0);
  });

  it('no E vote: non-exclusive admin for does not force 100 when community is against', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const auth = [makeOwnership('admin1')];
    const votes = [makeVote('admin2', 'for', BigInt(5)), makeVote('mallory', 'against', BigInt(6))];
    expect(
      computeApprovePercent(BASE_UPDATE, votes, gov, new Map([['mallory', 0]]), auth),
    ).toBe(0);
  });

  it('no E vote: only non-exclusive admin for yields baseline 100', () => {
    const gov = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const auth = [makeOwnership('admin1')];
    const votes = [makeVote('admin2', 'for', BigInt(5))];
    expect(computeApprovePercent(BASE_UPDATE, votes, gov, new Map(), auth)).toBe(100);
  });

  it('full without exclusive: later admin against yields 0', () => {
    const gov = {
      ...EMPTY_GOVERNANCE,
      admins: ['admin1', 'admin2'],
      object_control: 'full' as const,
    };
    const votes = [
      makeVote('admin1', 'for', BigInt(5)),
      makeVote('admin2', 'against', BigInt(10)),
    ];
    expect(computeApprovePercent(BASE_UPDATE, votes, gov, new Map(), ownerships)).toBe(0);
  });

  it('returns 100 / 0 for trusted with authority for / against', () => {
    const gov = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const auth = [makeOwnership('trusted1')];
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
      computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0], ['b', 0]]), ownerships),
    ).toBe(100);
  });

  it('returns 0 when only community against votes', () => {
    const votes = [makeVote('a', 'against')];
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0]]), ownerships)).toBe(0);
  });

  it('returns 0 when equal for and against weight', () => {
    const votes = [makeVote('a', 'for'), makeVote('b', 'against')];
    expect(
      computeApprovePercent(BASE_UPDATE, votes, governance, new Map([['a', 0], ['b', 0]]), ownerships),
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
    expect(computeApprovePercent(BASE_UPDATE, votes2, governance, m, ownerships)).toBe(80);
  });

  it('returns 70 when for_weight 7 and against_weight 3', () => {
    const votes = [makeVote('v1', 'for'), makeVote('v2', 'against')];
    const m = new Map<string, number>([
      ['v1', 7],
      ['v2', 3],
    ]);
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, m, ownerships)).toBe(70);
  });

  it('returns 66.667 when for_weight 2 and against_weight 1', () => {
    const votes = [makeVote('v1', 'for'), makeVote('v2', 'against')];
    const m = new Map<string, number>([
      ['v1', 2],
      ['v2', 1],
    ]);
    expect(computeApprovePercent(BASE_UPDATE, votes, governance, m, ownerships)).toBe(66.667);
  });

  it('ignores update when filtering by update_id', () => {
    const otherVote: ValidityVote = {
      ...makeVote('someone', 'against'),
      update_id: 'other',
    };
    expect(
      computeApprovePercent(BASE_UPDATE, [otherVote], governance, new Map(), ownerships),
    ).toBe(100);
  });

  it('matches resolveUpdateValidity community branch approve_percent', () => {
    const votes = [makeVote('voter1', 'for'), makeVote('voter2', 'against')];
    const reputations = new Map([
      ['voter1', 7],
      ['voter2', 3],
    ]);
    const p = computeApprovePercent(BASE_UPDATE, votes, governance, reputations, ownerships);
    const r = resolveUpdateValidity(BASE_UPDATE, votes, emptySet, governance, reputations, ownerships);
    expect(r.approve_percent).toBe(p);
  });
});
