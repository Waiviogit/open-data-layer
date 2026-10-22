import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { ObjectOwnership } from '@opden-data-layer/odl-db-types';

/**
 * Exclusive owner set E for curator filter, approve_percent, and winner-mode rank.
 *
 * 1. recognizedExclusive = exclusive holders ∩ (admins ∪ trusted ∪ authorities)
 * 2. If recognizedExclusive nonempty → E = recognizedExclusive (dominates, including object_control=full)
 * 3. Else if object_control = 'full' → E = governance.admins (implicit owners)
 * 4. Else → E = ∅
 *
 * Supervised ownership rows are stored but do not affect E.
 *
 * @see docs/spec/governance-resolution.md §8
 */
export function computeExclusiveOwnerSet(
  ownerships: ObjectOwnership[],
  governance: GovernanceSnapshot,
): Set<string> {
  const recognizedAuthorities = new Set([
    ...governance.admins,
    ...governance.trusted,
    ...governance.authorities,
  ]);
  const recognizedExclusive = new Set<string>();

  for (const row of ownerships) {
    if (row.ownership_type === 'exclusive' && recognizedAuthorities.has(row.account)) {
      recognizedExclusive.add(row.account);
    }
  }

  if (recognizedExclusive.size > 0) {
    return recognizedExclusive;
  }

  if (governance.object_control === 'full') {
    return new Set(governance.admins);
  }

  return new Set<string>();
}

/** @deprecated Use {@link computeExclusiveOwnerSet}. */
export const computeCuratorSet = computeExclusiveOwnerSet;
