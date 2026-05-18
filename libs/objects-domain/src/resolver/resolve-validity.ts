import type { ObjectUpdate, ValidityVote, ObjectAuthority } from '@opden-data-layer/core';
import { MIN_PERCENT_TO_SHOW_UPDATE } from '../constants';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { ValidityStatus, ValidityTier, VoterWaivPowerMap } from '../types';
import { waivVoteWeight } from './resolve-ranking';

/** Result of {@link resolveUpdateValidity} including tier metadata for single-cardinality ordering. */
export type ResolveUpdateValidityResult = {
  status: ValidityStatus;
  field_weight: number | null;
  approve_percent: number;
  validity_tier: ValidityTier | null;
  decisive_vote_event_seq: bigint | null;
};

/**
 * Compute the curator set C for an object.
 *
 * When object_control = 'full':
 *   C = governance.admins ∪ ownership_holders
 * Otherwise (null / unrecognised):
 *   C = ownership_holders ∩ (governance.admins ∪ governance.trusted)
 *
 * @see docs/spec/authority-entity.md §4
 * @see docs/spec/governance-resolution.md §8
 */
export function computeCuratorSet(
  authorities: ObjectAuthority[],
  governance: GovernanceSnapshot,
): Set<string> {
  const ownershipHolders = new Set(
    authorities
      .filter((a) => a.authority_type === 'ownership')
      .map((a) => a.account),
  );

  if (governance.object_control === 'full') {
    const full = new Set<string>(governance.admins);
    for (const holder of ownershipHolders) {
      full.add(holder);
    }
    return full;
  }

  const adminOrTrusted = new Set([...governance.admins, ...governance.trusted]);
  const intersection = new Set<string>();
  for (const holder of ownershipHolders) {
    if (adminOrTrusted.has(holder)) {
      intersection.add(holder);
    }
  }
  return intersection;
}

/**
 * Display / consensus approval percentage for one update (0–100, up to 3 decimals).
 * Reusable for list UI and for validity resolution.
 *
 * Mirrors the empty-curator hierarchy for percent only: admin LWAW → trusted LWTW →
 * community weights. When no decisive privileged vote applies and there are no
 * community votes, returns 100 (open baseline).
 */
export function computeApprovePercent(
  update: ObjectUpdate,
  validityVotes: ValidityVote[],
  governance: GovernanceSnapshot,
  voterWaivPowers: VoterWaivPowerMap,
  objectAuthorities: ObjectAuthority[],
): number {
  const updateVotes = validityVotes.filter((v) => v.update_id === update.update_id);

  const adminVotes = updateVotes.filter((v) => governance.admins.includes(v.voter));
  if (adminVotes.length > 0) {
    const latest = latestByEventSeq(adminVotes);
    return latest.vote === 'for' ? 100 : 0;
  }

  const accountsWithAuthority = new Set(objectAuthorities.map((a) => a.account));
  const trustedWithAuthority = governance.trusted.filter((t) => accountsWithAuthority.has(t));
  const trustedVotes = updateVotes.filter((v) => trustedWithAuthority.includes(v.voter));
  if (trustedVotes.length > 0) {
    const latest = latestByEventSeq(trustedVotes);
    return latest.vote === 'for' ? 100 : 0;
  }

  const adminSet = new Set(governance.admins);
  const trustedSet = new Set(governance.trusted);
  const communityVotes = updateVotes.filter(
    (v) => !adminSet.has(v.voter) && !trustedSet.has(v.voter),
  );
  if (communityVotes.length === 0) {
    return 100;
  }

  let for_weight = 0;
  let against_weight = 0;
  for (const vote of communityVotes) {
    const w = waivVoteWeight(voterWaivPowers.get(vote.voter) ?? 0);
    if (vote.vote === 'for') {
      for_weight += w;
    } else {
      against_weight += w;
    }
  }

  const net = for_weight - against_weight;
  if (net <= 0) {
    return 0;
  }
  if (against_weight === 0) {
    return 100;
  }
  return Math.round((for_weight / (for_weight + against_weight)) * 100 * 1000) / 1000;
}

/**
 * Resolve the validity status of a single update using the tiered hierarchy.
 *
 * Hierarchy (with non-empty curator set):
 *   Curator filter — valid only if creator ∈ C OR any C member voted 'for'.
 *   `approve_percent` is computed for display and matches {@link computeApprovePercent}.
 *
 * Hierarchy (empty curator set):
 *   1. Admin decisive vote (LWAW)
 *   2. Trusted decisive vote on objects they have authority over (LWTW)
 *   3. Community vote weight: field_weight = Σ(weight × sign); show iff approve_percent > MIN_PERCENT_TO_SHOW_UPDATE
 *   4. No community votes → baseline VALID (approve_percent 100 from {@link computeApprovePercent})
 *
 * @see docs/spec/data-model/flow.md §Step 4
 * @see docs/spec/vote-semantics.md §A and §C
 */
export function resolveUpdateValidity(
  update: ObjectUpdate,
  validityVotes: ValidityVote[],
  curatorSet: Set<string>,
  governance: GovernanceSnapshot,
  voterWaivPowers: VoterWaivPowerMap,
  objectAuthorities: ObjectAuthority[],
): ResolveUpdateValidityResult {
  const approve_percent = computeApprovePercent(
    update,
    validityVotes,
    governance,
    voterWaivPowers,
    objectAuthorities,
  );

  if (curatorSet.size > 0) {
    const { status, field_weight } = resolveCuratorFilter(update, validityVotes, curatorSet);
    return {
      status,
      field_weight,
      approve_percent,
      validity_tier: null,
      decisive_vote_event_seq: null,
    };
  }

  return resolveHierarchy(
    update,
    validityVotes,
    governance,
    voterWaivPowers,
    objectAuthorities,
    approve_percent,
  );
}

function resolveCuratorFilter(
  update: ObjectUpdate,
  validityVotes: ValidityVote[],
  curatorSet: Set<string>,
): { status: ValidityStatus; field_weight: null } {
  if (curatorSet.has(update.creator)) {
    return { status: 'VALID', field_weight: null };
  }
  const hasCuratorForVote = validityVotes.some(
    (v) => v.update_id === update.update_id && curatorSet.has(v.voter) && v.vote === 'for',
  );
  return { status: hasCuratorForVote ? 'VALID' : 'REJECTED', field_weight: null };
}

function resolveHierarchy(
  update: ObjectUpdate,
  validityVotes: ValidityVote[],
  governance: GovernanceSnapshot,
  voterWaivPowers: VoterWaivPowerMap,
  objectAuthorities: ObjectAuthority[],
  approve_percent: number,
): ResolveUpdateValidityResult {
  const updateVotes = validityVotes.filter((v) => v.update_id === update.update_id);

  const adminVotes = updateVotes.filter((v) => governance.admins.includes(v.voter));
  if (adminVotes.length > 0) {
    const latest = latestByEventSeq(adminVotes);
    return {
      status: latest.vote === 'for' ? 'VALID' : 'REJECTED',
      field_weight: null,
      approve_percent,
      validity_tier: 'admin',
      decisive_vote_event_seq: latest.event_seq,
    };
  }

  const accountsWithAuthority = new Set(objectAuthorities.map((a) => a.account));
  const trustedWithAuthority = governance.trusted.filter((t) => accountsWithAuthority.has(t));
  const trustedVotes = updateVotes.filter((v) => trustedWithAuthority.includes(v.voter));
  if (trustedVotes.length > 0) {
    const latest = latestByEventSeq(trustedVotes);
    return {
      status: latest.vote === 'for' ? 'VALID' : 'REJECTED',
      field_weight: null,
      approve_percent,
      validity_tier: 'trusted',
      decisive_vote_event_seq: latest.event_seq,
    };
  }

  const adminSet = new Set(governance.admins);
  const trustedSet = new Set(governance.trusted);
  const communityVotes = updateVotes.filter(
    (v) => !adminSet.has(v.voter) && !trustedSet.has(v.voter),
  );
  if (communityVotes.length === 0) {
    return {
      status: 'VALID',
      field_weight: null,
      approve_percent,
      validity_tier: 'baseline',
      decisive_vote_event_seq: null,
    };
  }

  let field_weight = 0;
  for (const vote of communityVotes) {
    const weight = waivVoteWeight(voterWaivPowers.get(vote.voter) ?? 0);
    const sign = vote.vote === 'for' ? 1 : -1;
    field_weight += weight * sign;
  }
  return {
    status: approve_percent > MIN_PERCENT_TO_SHOW_UPDATE ? 'VALID' : 'REJECTED',
    field_weight,
    approve_percent,
    validity_tier: 'community',
    decisive_vote_event_seq: null,
  };
}

function latestByEventSeq(votes: ValidityVote[]): ValidityVote {
  return votes.reduce((best, v) => (v.event_seq > best.event_seq ? v : best));
}
