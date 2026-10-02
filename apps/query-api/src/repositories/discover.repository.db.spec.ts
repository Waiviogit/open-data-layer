import type { Kysely } from 'kysely';
import { migrateToLatest } from '@opden-data-layer/migrations';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import {
  createTestDb,
  resolveTestPostgresUrl,
  withRollback,
} from '@opden-data-layer/test-postgres';
import type { RedisClientFactory } from '@opden-data-layer/clients';

import type { Database } from '../database';
import { DiscoverRepository } from './discover.repository';

const describeDb = process.env.POSTGRES_TEST_URL ? describe : describe.skip;

type Trx = Kysely<OdlDatabase>;

function stubRedis(): {
  factory: RedisClientFactory;
  get: jest.Mock;
  set: jest.Mock;
} {
  const get = jest.fn().mockResolvedValue(null);
  const set = jest.fn().mockResolvedValue(undefined);
  return {
    factory: { getClient: () => ({ get, set }) } as unknown as RedisClientFactory,
    get,
    set,
  };
}

function repo(trx: Trx, factory: RedisClientFactory): DiscoverRepository {
  return new DiscoverRepository(trx as unknown as Kysely<Database>, factory);
}

async function insertObject(
  trx: Trx,
  input: {
    objectId: string;
    weight?: number | null;
    metaGroupId?: string | null;
    createdAt: string;
    status?: 'active' | 'unavailable';
    objectType?: string;
  },
): Promise<void> {
  await trx
    .insertInto('objects_core')
    .values({
      object_id: input.objectId,
      object_type: input.objectType ?? 'product',
      creator: 'alice',
      transaction_id: `tx-${input.objectId}`,
      status: input.status ?? 'active',
      weight: input.weight === undefined ? null : input.weight,
      meta_group_id: input.metaGroupId ?? null,
      created_at: input.createdAt,
    })
    .execute();
}

async function insertTag(
  trx: Trx,
  objectId: string,
  category: string,
  value: string,
  objectType = 'product',
): Promise<void> {
  await trx
    .insertInto('object_tag_category_items')
    .values({
      object_id: objectId,
      object_type: objectType,
      category,
      value,
    })
    .execute();
}

async function insertName(trx: Trx, objectId: string, name: string): Promise<void> {
  await trx
    .insertInto('object_updates')
    .values({
      update_id: `upd-${objectId}-name`,
      object_id: objectId,
      update_type: 'name',
      creator: 'alice',
      locale: 'en-US',
      created_at_unix: 1,
      event_seq: BigInt(1),
      transaction_id: `tx-${objectId}-name`,
      value_text: name,
      value_geo: null,
      value_json: null,
    })
    .execute();
}

async function seedShared(trx: Trx): Promise<void> {
  await insertObject(trx, {
    objectId: 'ov-a',
    weight: 10,
    metaGroupId: 'overmont',
    createdAt: '2026-01-03T00:00:00.000Z',
  });
  await insertObject(trx, {
    objectId: 'ov-b',
    weight: 30,
    metaGroupId: 'overmont',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await insertObject(trx, {
    objectId: 'ov-c',
    weight: 20,
    metaGroupId: 'overmont',
    createdAt: '2026-01-05T00:00:00.000Z',
  });
  await insertObject(trx, {
    objectId: 'ov-x',
    weight: 100,
    metaGroupId: 'overmont',
    createdAt: '2026-01-06T00:00:00.000Z',
    status: 'unavailable',
  });
  await insertObject(trx, {
    objectId: 'solo-1',
    weight: 25,
    createdAt: '2026-01-02T00:00:00.000Z',
  });
  await insertObject(trx, {
    objectId: 'solo-2',
    weight: 5,
    createdAt: '2026-01-04T00:00:00.000Z',
  });

  await insertTag(trx, 'ov-a', 'Category', 'Camping');
  await insertTag(trx, 'ov-a', 'Pros', 'Heated');
  await insertTag(trx, 'ov-b', 'Category', 'Camping');
  await insertTag(trx, 'ov-c', 'Category', 'Camping');
  await insertTag(trx, 'ov-x', 'Category', 'Camping');
  await insertTag(trx, 'ov-x', 'Pros', 'Discontinued');
  await insertTag(trx, 'solo-1', 'Category', 'Camping');
  await insertName(trx, 'ov-c', 'Overmont Camping Chair');
}

function idsOf(rows: { object_id: string }[]): string[] {
  return rows.map((r) => r.object_id);
}

describeDb('DiscoverRepository meta_group collapse', () => {
  const db = createTestDb();

  beforeAll(async () => {
    const migrated = await migrateToLatest({ connectionString: resolveTestPostgresUrl() });
    if (migrated.error) {
      throw migrated.error;
    }
  }, 60_000);

  afterAll(async () => {
    await db.destroy();
  });

  it('TC-001 rank shows one card per product group, using its highest-weight SKU', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-b', 'solo-1', 'solo-2']);
      expect(result.hasMore).toBe(false);
    });
  });

  it('TC-002 newest represents a group by its newest SKU', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'newest',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-c', 'solo-2', 'solo-1']);
    });
  });

  it('TC-003 oldest represents a group by its oldest SKU', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'oldest',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-b', 'solo-1', 'solo-2']);
    });
  });

  it('TC-004 only SKUs that match the tag filter can represent the group', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [{ category: 'Pros', value: 'Heated' }],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-a']);
    });
  });

  it('TC-005 only SKUs that match the text query can represent the group', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        q: 'overmont camping',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-c']);
    });
  });

  it('TC-006 a higher-weight inactive sibling never represents the group', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(result.rows[0]?.object_id).toBe('ov-b');
      expect(idsOf(result.rows)).not.toContain('ov-x');
    });
  });

  it('TC-007 ungrouped objects are never merged with each other', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-b', 'solo-1', 'solo-2']);
    });
  });

  it('TC-008 paging with cursor never repeats a group', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const discover = repo(trx, stubRedis().factory);
      const pages: string[][] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await discover.listObjects({
          objectType: 'product',
          tags: [],
          sort: 'rank',
          limit: 1,
          cursor,
        });
        pages.push(idsOf(page.rows));
        hasMore = page.hasMore;
        const last = page.rows[page.rows.length - 1];
        cursor = last ? discover.buildObjectCursor(last, 'rank') : undefined;
      }
      expect(pages).toEqual([['ov-b'], ['solo-1'], ['solo-2']]);
    });
  });

  it('TC-009 Camping facet counts groups, not SKUs', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const redis = stubRedis();
      const rows = await repo(trx, redis.factory).getTagCategories('product');
      expect(rows).toEqual(
        expect.arrayContaining([
          { category: 'Category', tag_value: 'Camping', object_count: 2 },
          { category: 'Pros', tag_value: 'Heated', object_count: 1 },
        ]),
      );
      expect(rows.find((r) => r.category === 'Pros' && r.tag_value === 'Discontinued')).toBeUndefined();
      expect(redis.set).toHaveBeenCalledTimes(1);
    });
  });

  it('TC-010 facet counts with active tags count groups', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const redis = stubRedis();
      const rows = await repo(trx, redis.factory).getTagCategories('product', [
        { category: 'Category', value: 'Camping' },
      ]);
      expect(rows).toEqual(
        expect.arrayContaining([
          { category: 'Category', tag_value: 'Camping', object_count: 2 },
        ]),
      );
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  it('TC-011 facet counts with a text query count groups', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const redis = stubRedis();
      const rows = await repo(trx, redis.factory).getTagCategories('product', [], 'overmont camping');
      expect(rows).toEqual(
        expect.arrayContaining([
          { category: 'Category', tag_value: 'Camping', object_count: 1 },
        ]),
      );
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  it('TC-012 inactive SKUs are excluded from cached facet counts', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const rows = await repo(trx, stubRedis().factory).getTagCategories('product');
      expect(rows.find((r) => r.category === 'Pros' && r.tag_value === 'Discontinued')).toBeUndefined();
    });
  });

  it('TC-020 inside a group, a SKU with NULL weight loses to a weight-0 sibling', async () => {
    await withRollback(db, async (trx) => {
      await insertObject(trx, {
        objectId: 'n-null',
        weight: null,
        metaGroupId: 'g0',
        createdAt: '2026-02-01T00:00:00.000Z',
      });
      await insertObject(trx, {
        objectId: 'n-zero',
        weight: 0,
        metaGroupId: 'g0',
        createdAt: '2026-02-02T00:00:00.000Z',
      });
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['n-zero']);
    });
  });

  it('TC-021 a group where every weight is NULL picks object_id ASC and sorts last', async () => {
    await withRollback(db, async (trx) => {
      await insertObject(trx, {
        objectId: 'z-2',
        weight: null,
        metaGroupId: 'gn',
        createdAt: '2026-02-01T00:00:00.000Z',
      });
      await insertObject(trx, {
        objectId: 'z-1',
        weight: null,
        metaGroupId: 'gn',
        createdAt: '2026-02-02T00:00:00.000Z',
      });
      await insertObject(trx, {
        objectId: 'solo-1',
        weight: 25,
        createdAt: '2026-01-02T00:00:00.000Z',
      });
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['solo-1', 'z-1']);
    });
  });

  it('TC-022 equal weights across groups page deterministically with no gaps', async () => {
    await withRollback(db, async (trx) => {
      await insertObject(trx, {
        objectId: 'a-1',
        weight: 7,
        metaGroupId: 'ga',
        createdAt: '2026-03-01T00:00:00.000Z',
      });
      await insertObject(trx, {
        objectId: 'b-1',
        weight: 7,
        metaGroupId: 'gb',
        createdAt: '2026-03-02T00:00:00.000Z',
      });
      const discover = repo(trx, stubRedis().factory);
      const first = await discover.listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 1,
      });
      expect(idsOf(first.rows)).toEqual(['a-1']);
      expect(first.hasMore).toBe(true);
      const second = await discover.listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 1,
        cursor: discover.buildObjectCursor(first.rows[0]!, 'rank'),
      });
      expect(idsOf(second.rows)).toEqual(['b-1']);
      expect(second.hasMore).toBe(false);
    });
  });

  it('TC-023 a fractional-weight rank cursor reaches page 2', async () => {
    await withRollback(db, async (trx) => {
      await insertObject(trx, {
        objectId: 'hi',
        weight: 9.71,
        createdAt: '2026-03-01T00:00:00.000Z',
      });
      await insertObject(trx, {
        objectId: 'lo',
        weight: 3.5,
        createdAt: '2026-03-02T00:00:00.000Z',
      });
      const discover = repo(trx, stubRedis().factory);
      const first = await discover.listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 1,
      });
      expect(idsOf(first.rows)).toEqual(['hi']);
      const second = await discover.listObjects({
        objectType: 'product',
        tags: [],
        sort: 'rank',
        limit: 1,
        cursor: discover.buildObjectCursor(first.rows[0]!, 'rank'),
      });
      expect(idsOf(second.rows)).toEqual(['lo']);
    });
  });

  it('TC-024 collapse still applies without an object type', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        tags: [],
        sort: 'rank',
        limit: 20,
      });
      expect(idsOf(result.rows)).toEqual(['ov-b', 'solo-1', 'solo-2']);
    });
  });

  it('TC-025 no matches returns an empty page', async () => {
    await withRollback(db, async (trx) => {
      await seedShared(trx);
      const result = await repo(trx, stubRedis().factory).listObjects({
        objectType: 'product',
        tags: [{ category: 'Category', value: 'Nope' }],
        sort: 'rank',
        limit: 20,
      });
      expect(result).toEqual({ rows: [], hasMore: false });
    });
  });
});
