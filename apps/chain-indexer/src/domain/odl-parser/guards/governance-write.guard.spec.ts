import { OBJECT_TYPES } from '@opden-data-layer/core';
import { GovernanceWriteGuard } from './governance-write.guard';

describe('GovernanceWriteGuard', () => {
  const guard = new GovernanceWriteGuard();

  it('blocks when event signer is not object creator', () => {
    expect(
      guard.check({
        action: 'update_create',
        object_type: OBJECT_TYPES.GOVERNANCE,
        object_id: 'g1',
        object_creator: 'alice',
        event_creator: 'bob',
        update_type: 'admins',
      }),
    ).toBe('UNAUTHORIZED_GOVERNANCE_OP');
  });

  it('allows when event signer is object creator', () => {
    expect(
      guard.check({
        action: 'update_vote',
        object_type: OBJECT_TYPES.GOVERNANCE,
        object_id: 'g1',
        object_creator: 'alice',
        event_creator: 'alice',
      }),
    ).toBeNull();
  });

  it('does not apply to non-governance objects', () => {
    expect(
      guard.supports({
        action: 'update_create',
        object_type: OBJECT_TYPES.PAGE,
        object_id: 'p1',
        object_creator: 'alice',
        event_creator: 'alice',
      }),
    ).toBe(false);
  });
});
