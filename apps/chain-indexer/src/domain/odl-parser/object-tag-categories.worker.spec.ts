import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectTagCategoriesWorker } from './object-tag-categories.worker';

describe('ObjectTagCategoriesWorker', () => {
  it('does nothing when queue is empty', async () => {
    const loadByObjectIds = jest.fn();
    const worker = new ObjectTagCategoriesWorker(
      { get: jest.fn() } as unknown as ConfigService,
      { addInterval: jest.fn(), deleteInterval: jest.fn() } as unknown as SchedulerRegistry,
      { claimBatch: jest.fn().mockResolvedValue([]) } as never,
      { loadByObjectIds } as never,
      { resolvePlatform: jest.fn() } as never,
      { resolve: jest.fn() } as never,
      { replaceForObject: jest.fn() } as never,
    );

    await worker.runBatch();

    expect(loadByObjectIds).not.toHaveBeenCalled();
  });

  it('resolves tagCategoryItem and replaces materialized rows', async () => {
    const aggregated = {
      core: { object_id: 'o1', object_type: 'restaurant', status: 'active' as const },
      updates: [],
      validity_votes: [],
      rank_votes: [],
      authorities: [],
    };
    const resolve = jest.fn().mockReturnValue([
      {
        object_id: 'o1',
        fields: {
          [UPDATE_TYPES.TAG_CATEGORY_ITEM]: {
            values: [
              {
                value_json: { category: 'Cuisine', value: 'Asian' },
              },
            ],
          },
        },
      },
    ]);
    const replaceForObject = jest.fn().mockResolvedValue(undefined);
    const deleteOne = jest.fn().mockResolvedValue(undefined);

    const worker = new ObjectTagCategoriesWorker(
      {
        get: jest.fn((_key: string, def: unknown) => def),
      } as unknown as ConfigService,
      { addInterval: jest.fn(), deleteInterval: jest.fn() } as unknown as SchedulerRegistry,
      {
        claimBatch: jest.fn().mockResolvedValue([{ object_id: 'o1', attempts: 1 }]),
        deleteOne,
        resetAttempt: jest.fn(),
      } as never,
      {
        loadByObjectIds: jest.fn().mockResolvedValue({
          objects: [aggregated],
          voterWaivPowers: new Map(),
        }),
      } as never,
      { resolvePlatform: jest.fn().mockResolvedValue({}) } as never,
      { resolve } as never,
      { replaceForObject } as never,
    );

    await worker.runBatch();

    expect(resolve).toHaveBeenCalledWith(
      [aggregated],
      expect.any(Map),
      expect.objectContaining({
        update_types: [UPDATE_TYPES.TAG_CATEGORY_ITEM],
      }),
    );
    expect(replaceForObject).toHaveBeenCalledWith('o1', 'restaurant', [
      { category: 'Cuisine', value: 'Asian' },
    ]);
    expect(deleteOne).toHaveBeenCalledWith('o1');
  });

  it('clears materialized rows when object status is not active', async () => {
    const aggregated = {
      core: { object_id: 'o1', object_type: 'restaurant', status: 'unavailable' as const },
      updates: [],
      validity_votes: [],
      rank_votes: [],
      authorities: [],
    };
    const replaceForObject = jest.fn().mockResolvedValue(undefined);

    const worker = new ObjectTagCategoriesWorker(
      {
        get: jest.fn((_key: string, def: unknown) => def),
      } as unknown as ConfigService,
      { addInterval: jest.fn(), deleteInterval: jest.fn() } as unknown as SchedulerRegistry,
      {
        claimBatch: jest.fn().mockResolvedValue([{ object_id: 'o1', attempts: 1 }]),
        deleteOne: jest.fn(),
        resetAttempt: jest.fn(),
      } as never,
      {
        loadByObjectIds: jest.fn().mockResolvedValue({
          objects: [aggregated],
          voterWaivPowers: new Map(),
        }),
      } as never,
      { resolvePlatform: jest.fn().mockResolvedValue({}) } as never,
      { resolve: jest.fn() } as never,
      { replaceForObject } as never,
    );

    await worker.runBatch();

    expect(replaceForObject).toHaveBeenCalledWith('o1', 'restaurant', []);
  });

  it('drops queue row when object is missing', async () => {
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const replaceForObject = jest.fn().mockResolvedValue(undefined);

    const worker = new ObjectTagCategoriesWorker(
      { get: jest.fn((_key: string, def: unknown) => def) } as unknown as ConfigService,
      { addInterval: jest.fn(), deleteInterval: jest.fn() } as unknown as SchedulerRegistry,
      {
        claimBatch: jest.fn().mockResolvedValue([{ object_id: 'missing', attempts: 1 }]),
        deleteOne,
        resetAttempt: jest.fn(),
      } as never,
      {
        loadByObjectIds: jest.fn().mockResolvedValue({
          objects: [],
          voterWaivPowers: new Map(),
        }),
      } as never,
      { resolvePlatform: jest.fn() } as never,
      { resolve: jest.fn() } as never,
      { replaceForObject } as never,
    );

    await worker.runBatch();

    expect(deleteOne).toHaveBeenCalledWith('missing');
    expect(replaceForObject).not.toHaveBeenCalled();
  });
});
