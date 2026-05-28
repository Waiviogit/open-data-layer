import { DiscoverRepository } from './discover.repository';
import type { Kysely } from 'kysely';
import type { RedisClientFactory } from '@opden-data-layer/clients';

function createMockDb(executeImpl: jest.Mock) {
  return {
    execute: executeImpl,
  } as unknown as Kysely<unknown>;
}

describe('DiscoverRepository', () => {
  it('getTagCategories returns cached JSON without hitting DB', async () => {
    const cached = JSON.stringify([
      { category: 'Pros', tag_value: 'Bitter', object_count: 1 },
    ]);
    const redisGet = jest.fn().mockResolvedValue(cached);
    const redisSet = jest.fn().mockResolvedValue(undefined);
    const redisFactory = {
      getClient: () => ({ get: redisGet, set: redisSet }),
    } as unknown as RedisClientFactory;

    const execute = jest.fn();
    const db = createMockDb(execute);
    const repo = new DiscoverRepository(db as never, redisFactory);

    const rows = await repo.getTagCategories('product');

    expect(rows).toHaveLength(1);
    expect(execute).not.toHaveBeenCalled();
    expect(redisGet).toHaveBeenCalled();
  });

  it('getTagCategories with active tags skips redis cache', async () => {
    const redisGet = jest.fn().mockResolvedValue(null);
    const redisSet = jest.fn().mockResolvedValue(undefined);
    const redisFactory = {
      getClient: () => ({ get: redisGet, set: redisSet }),
    } as unknown as RedisClientFactory;

    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const db = createMockDb(execute);
    const repo = new DiscoverRepository(db as never, redisFactory);

    await repo.getTagCategories('restaurant', [{ category: 'Cuisine', value: 'Asian' }]);

    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });
});
