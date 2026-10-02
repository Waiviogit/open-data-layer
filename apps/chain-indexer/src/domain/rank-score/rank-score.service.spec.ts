import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import { RankScoreService } from './rank-score.service';

describe('RankScoreService', () => {
  const updateId = 'u-multi';
  const objectId = 'obj-1';

  function createService(mocks: {
    findByUpdateId?: jest.Mock;
    findUpdates?: jest.Mock;
    listByUpdateId?: jest.Mock;
    findByObjectId?: jest.Mock;
    resolvePlatform?: jest.Mock;
    ensure?: jest.Mock;
    findWaivPowersByAccounts?: jest.Mock;
    update?: jest.Mock;
  }) {
    return new RankScoreService(
      {
        listByUpdateId:
          mocks.listByUpdateId ??
          jest.fn().mockResolvedValue([
            {
              update_id: updateId,
              object_id: objectId,
              voter: 'admin1',
              rank: 100,
              rank_context: 'default',
              event_seq: BigInt(10),
              transaction_id: 'tx1',
            },
            {
              update_id: updateId,
              object_id: objectId,
              voter: 'admin2',
              rank: 9000,
              rank_context: 'default',
              event_seq: BigInt(20),
              transaction_id: 'tx2',
            },
          ]),
      } as never,
      {
        findByUpdateId:
          mocks.findByUpdateId ??
          jest.fn().mockResolvedValue({
            update_id: updateId,
            object_id: objectId,
            update_type: 'imageGalleryItem',
          }),
        find:
          mocks.findUpdates ??
          jest.fn().mockResolvedValue([
            {
              update_id: updateId,
              object_id: objectId,
              update_type: 'imageGalleryItem',
            },
            {
              update_id: 'u-single',
              object_id: objectId,
              update_type: 'name',
            },
          ]),
        update: mocks.update ?? jest.fn().mockResolvedValue(undefined),
      } as never,
      {
        findByObjectId:
          mocks.findByObjectId ??
          jest.fn().mockResolvedValue([
            {
              object_id: objectId,
              account: 'admin1',
              ownership_type: 'exclusive',
              event_seq: BigInt(1),
              created_at: new Date(),
            },
          ]),
      } as never,
      {
        findWaivPowersByAccounts:
          mocks.findWaivPowersByAccounts ?? jest.fn().mockResolvedValue(new Map()),
      } as never,
      {
        ensure: mocks.ensure ?? jest.fn().mockResolvedValue(undefined),
      } as never,
      {
        resolvePlatform:
          mocks.resolvePlatform ??
          jest.fn().mockResolvedValue({
            admins: ['admin1', 'admin2'],
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
          }),
      } as never,
    );
  }

  it('persists exclusive-admin rank when non-exclusive admin rank is later', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const service = createService({ update });

    await service.recalculateForUpdateId(updateId);

    expect(update).toHaveBeenCalledWith(updateId, {
      rank_score: 100,
      rank_context: 'default',
      rank_decisive_event_seq: BigInt(10),
    });
  });

  it('recalculateForObjectId only recalculates multi-cardinality updates', async () => {
    const findByUpdateId = jest
      .fn()
      .mockResolvedValueOnce({
        update_id: updateId,
        object_id: objectId,
        update_type: 'imageGalleryItem',
      })
      .mockResolvedValueOnce({
        update_id: 'u-single',
        object_id: objectId,
        update_type: 'name',
      });
    const update = jest.fn().mockResolvedValue(undefined);
    const service = createService({ findByUpdateId, update });

    await service.recalculateForObjectId(objectId);

    expect(findByUpdateId).toHaveBeenCalledTimes(1);
    expect(findByUpdateId).toHaveBeenCalledWith(updateId);
    expect(UPDATE_REGISTRY['imageGalleryItem'].cardinality).toBe('multi');
    expect(UPDATE_REGISTRY['name'].cardinality).toBe('single');
  });

  it('recalculateForObjectId is a no-op for blank object id', async () => {
    const findUpdates = jest.fn();
    const service = createService({ findUpdates });

    await service.recalculateForObjectId('   ');

    expect(findUpdates).not.toHaveBeenCalled();
  });
});
