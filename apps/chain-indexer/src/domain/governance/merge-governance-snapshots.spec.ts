import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import { mergeGovernanceSnapshots } from './merge-governance-snapshots';

describe('mergeGovernanceSnapshots', () => {
  it('unions string array fields with base order first', () => {
    const base = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      admins: ['a1'],
      banned: ['b1'],
    };
    const overlay = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      admins: ['a2', 'a1'],
      banned: ['b2'],
    };
    const merged = mergeGovernanceSnapshots(overlay, base);
    expect(merged.admins).toEqual(['a1', 'a2']);
    expect(merged.banned).toEqual(['b1', 'b2']);
  });

  it('prefers overlay validity_cutoff row for the same account', () => {
    const base = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      validity_cutoff: [{ account: 'acc', timestamp: 1 }],
    };
    const overlay = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      validity_cutoff: [{ account: 'acc', timestamp: 99 }],
    };
    const merged = mergeGovernanceSnapshots(overlay, base);
    expect(merged.validity_cutoff).toEqual([{ account: 'acc', timestamp: 99 }]);
  });

  it('uses base object_control when overlay is null', () => {
    const base = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      object_control: 'full' as const,
    };
    const overlay = { ...DEFAULT_GOVERNANCE_SNAPSHOT, object_control: null };
    expect(mergeGovernanceSnapshots(overlay, base).object_control).toBe('full');
  });

  it('uses overlay object_control when non-null', () => {
    const base = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      object_control: null,
    };
    const overlay = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      object_control: 'full' as const,
    };
    expect(mergeGovernanceSnapshots(overlay, base).object_control).toBe('full');
  });

  it('prefers overlay inherits_from entry when object_id collides', () => {
    const base = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      inherits_from: [{ object_id: 'x', scope: ['admins' as const] }],
    };
    const overlay = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      inherits_from: [{ object_id: 'x', scope: ['trusted' as const] }],
    };
    const merged = mergeGovernanceSnapshots(overlay, base);
    expect(merged.inherits_from).toEqual([{ object_id: 'x', scope: ['trusted'] }]);
  });
});
