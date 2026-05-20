import type { OdlEventContext } from '../odl-action-handler';
import { FollowObjectHandler } from './follow-object.handler';

const baseCtx: OdlEventContext = {
  action: 'object_follow',
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

describe('FollowObjectHandler', () => {
  const objectId = 'obj-1';

  function createHandler(mocks: {
    findByObjectId?: jest.Mock;
    upsert?: jest.Mock;
    delete?: jest.Mock;
    updateBell?: jest.Mock;
    findByAccountAndObject?: jest.Mock;
  }) {
    return new FollowObjectHandler(
      {
        findByObjectId: mocks.findByObjectId ?? jest.fn().mockResolvedValue({ object_id: objectId }),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      {
        upsert: mocks.upsert ?? jest.fn().mockResolvedValue(undefined),
        delete: mocks.delete ?? jest.fn().mockResolvedValue(undefined),
        updateBell: mocks.updateBell ?? jest.fn().mockResolvedValue(undefined),
        findByAccountAndObject:
          mocks.findByAccountAndObject ?? jest.fn().mockResolvedValue({ account: 'alice', object_id: objectId, bell: false }),
      } as unknown as import('../../../repositories').UserObjectFollowsRepository,
    );
  }

  it('follow — upserts with bell false and created_at from ctx', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const handler = createHandler({ upsert });

    await handler.handle({ object_id: objectId, method: 'follow' }, baseCtx);

    expect(upsert).toHaveBeenCalledWith({
      account: 'alice',
      object_id: objectId,
      bell: false,
      created_at: new Date(baseCtx.timestamp),
    });
  });

  it('follow — unknown object skips upsert', async () => {
    const upsert = jest.fn();
    const findByObjectId = jest.fn().mockResolvedValue(null);
    const handler = createHandler({ upsert, findByObjectId });

    await handler.handle({ object_id: objectId, method: 'follow' }, baseCtx);

    expect(upsert).not.toHaveBeenCalled();
  });

  it('unfollow — deletes follow row', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const handler = createHandler({ delete: deleteFn });

    await handler.handle({ object_id: objectId, method: 'unfollow' }, baseCtx);

    expect(deleteFn).toHaveBeenCalledWith('alice', objectId);
  });

  it('bell — updates bell when row exists', async () => {
    const updateBell = jest.fn().mockResolvedValue(undefined);
    const handler = createHandler({ updateBell });

    await handler.handle({ object_id: objectId, method: 'bell', bell: true }, baseCtx);

    expect(updateBell).toHaveBeenCalledWith('alice', objectId, true);
  });

  it('bell — not following skips updateBell', async () => {
    const updateBell = jest.fn();
    const findByAccountAndObject = jest.fn().mockResolvedValue(null);
    const handler = createHandler({ updateBell, findByAccountAndObject });

    await handler.handle({ object_id: objectId, method: 'bell', bell: true }, baseCtx);

    expect(updateBell).not.toHaveBeenCalled();
  });

  it('invalid payload — no repo calls', async () => {
    const upsert = jest.fn();
    const deleteFn = jest.fn();
    const updateBell = jest.fn();
    const handler = createHandler({ upsert, delete: deleteFn, updateBell });

    await handler.handle({ object_id: '', method: 'invalid' }, baseCtx);

    expect(upsert).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(updateBell).not.toHaveBeenCalled();
  });
});
