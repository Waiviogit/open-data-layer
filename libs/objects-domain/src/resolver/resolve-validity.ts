import type { ObjectUpdate, ValidityVote, ObjectAuthority } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { ValidityStatus, VoterReputationMap } from '../types';

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
 * Resolve the validity status of a single update using the tiered hierarchy.
 *
 * Hierarchy (with non-empty curator set):
 *   Curator filter — valid only if creator ∈ C OR any C member voted 'for'.
 *
 * Hierarchy (empty curator set):
 *   1. Admin decisive vote (LWAW)
 *   2. Trusted decisive vote on objects they have authority over (LWTW)
 *   3. Community vote weight: field_weight = Σ(votePower × sign)
 *   4. No votes → baseline VALID
 *
 * @see docs/spec/data-model/flow.md §Step 4
 * @see docs/spec/vote-semantics.md §A and §C
 */
export function resolveUpdateValidity(
  update: ObjectUpdate,
  validityVotes: ValidityVote[],
  curatorSet: Set<string>,
  governance: GovernanceSnapshot,
  voterReputations: VoterReputationMap,
  objectAuthorities: ObjectAuthority[],
): { status: ValidityStatus; field_weight: number | null } {
  if (curatorSet.size > 0) {
    return resolveCuratorFilter(update, validityVotes, curatorSet);
  }
  return resolveHierarchy(update, validityVotes, governance, voterReputations, objectAuthorities);
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
  voterReputations: VoterReputationMap,
  objectAuthorities: ObjectAuthority[],
): { status: ValidityStatus; field_weight: number | null } {
  const updateVotes = validityVotes.filter((v) => v.update_id === update.update_id);

  const adminVotes = updateVotes.filter((v) => governance.admins.includes(v.voter));
  if (adminVotes.length > 0) {
    const latest = latestByEventSeq(adminVotes);
    return { status: latest.vote === 'for' ? 'VALID' : 'REJECTED', field_weight: null };
  }

  const accountsWithAuthority = new Set(objectAuthorities.map((a) => a.account));
  const trustedWithAuthority = governance.trusted.filter((t) => accountsWithAuthority.has(t));
  const trustedVotes = updateVotes.filter((v) => trustedWithAuthority.includes(v.voter));
  if (trustedVotes.length > 0) {
    const latest = latestByEventSeq(trustedVotes);
    return { status: latest.vote === 'for' ? 'VALID' : 'REJECTED', field_weight: null };
  }

  const adminSet = new Set(governance.admins);
  const trustedSet = new Set(governance.trusted);
  const communityVotes = updateVotes.filter(
    (v) => !adminSet.has(v.voter) && !trustedSet.has(v.voter),
  );
  if (communityVotes.length === 0) {
    return { status: 'VALID', field_weight: null };
  }

  let field_weight = 0;
  for (const vote of communityVotes) {
    const reputation = voterReputations.get(vote.voter) ?? 0;
    const votePower = 1 + Math.log2(1 + reputation);
    const sign = vote.vote === 'for' ? 1 : -1;
    field_weight += votePower * sign;
  }
  return {
    status: field_weight >= 0 ? 'VALID' : 'REJECTED',
    field_weight,
  };
}

function latestByEventSeq(votes: ValidityVote[]): ValidityVote {
  return votes.reduce((best, v) => (v.event_seq > best.event_seq ? v : best));
}
