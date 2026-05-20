import type { OdlEventContext } from '../odl-action-handler';
import { FollowUserBellHandler } from './follow-user-bell.handler';

const baseCtx: OdlEventContext = {
  action: 'user_follow',
  creator: 'alice',
  blockNum: 10,
  transactionIndex: 0,
  operationIndex: 0,
  odlEventIndex: 0,
  transactionId: 'hive-trx-abc',
  timestamp: '2026-01-01T00:00:00.000Z',
  eventSeq: BigInt(1),
  eventIdIndexMap: new Map(),
};

describe('FollowUserBellHandler', () => {
  function createHandler(mocks: {
    subscriptionExists?: jest.Mock;
    updateSubscriptionBell?: jest.Mock;
  }) {
    return new FollowUserBellHandler({
      subscriptionExists: mocks.subscriptionExists ?? jest.fn().mockResolvedValue(true),
      updateSubscriptionBell: mocks.updateSubscriptionBell ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as import('../../../repositories/social-graph.repository').SocialGraphRepository);
  }

  it('updates bell when subscription exists', async () => {
    const updateSubscriptionBell = jest.fn().mockResolvedValue(undefined);
    const handler = createHandler({ updateSubscriptionBell });

    await handler.handle({ following: 'bob', method: 'bell', bell: true }, baseCtx);

    expect(updateSubscriptionBell).toHaveBeenCalledWith('alice', 'bob', true);
  });

  it('skips when subscription missing', async () => {
    const updateSubscriptionBell = jest.fn();
    const subscriptionExists = jest.fn().mockResolvedValue(false);
    const handler = createHandler({ subscriptionExists, updateSubscriptionBell });

    await handler.handle({ following: 'bob', method: 'bell', bell: true }, baseCtx);

    expect(updateSubscriptionBell).not.toHaveBeenCalled();
  });

  it('ignores invalid payload', async () => {
    const updateSubscriptionBell = jest.fn();
    const handler = createHandler({ updateSubscriptionBell });

    await handler.handle({ following: 'bob', method: 'follow' }, baseCtx);

    expect(updateSubscriptionBell).not.toHaveBeenCalled();
  });
});
