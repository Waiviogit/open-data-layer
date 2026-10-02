import { DiscoverRepository } from './discover.repository';
import { PostgresQueryCompiler, type Kysely } from 'kysely';
import type { RedisClientFactory } from '@opden-data-layer/clients';
import { encodeDiscoverObjectCursor } from '../domain/discover/discover-cursor';

function createMockDb(executeImpl: jest.Mock) {
  return {
    execute: executeImpl,
  } as unknown as Kysely<unknown>;
}

function createQueryCapturingDb(executeQuery: jest.Mock) {
  const compiler = new PostgresQueryCompiler();
  const executor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: unknown, queryId: unknown) =>
      compiler.compileQuery(node as never, queryId as never),
    withPlugins<T extends { transformQuery: unknown }>(this: T) {
      return this;
    },
    executeQuery,
  };
  return { getExecutor: () => executor } as unknown as Kysely<unknown>;
}

function emptyRedisFactory(): RedisClientFactory {
  return {
    getClient: () => ({ get: jest.fn(), set: jest.fn() }),
  } as unknown as RedisClientFactory;
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

  it('getTagCategories with q skips redis cache', async () => {
    const redisGet = jest.fn();
    const redisSet = jest.fn();
    const redisFactory = {
      getClient: () => ({ get: redisGet, set: redisSet }),
    } as unknown as RedisClientFactory;

    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const db = createMockDb(execute);
    const repo = new DiscoverRepository(db as never, redisFactory);

    const rows = await repo.getTagCategories('product', [], 'burger');

    expect(rows).toEqual([]);
    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('listObjects rank cursor uses object_id ASC tie-break (>)', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    const cursor = encodeDiscoverObjectCursor({
      sort: 'rank',
      created_at: '2026-01-01T00:00:00.000Z',
      weight: 0,
      object_id: 'cursor-obj',
    });

    await repo.listObjects({
      tags: [],
      sort: 'rank',
      cursor,
      limit: 20,
    });

    expect(executeQuery).toHaveBeenCalledTimes(1);
    const compiled = executeQuery.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).toContain('DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))');
    expect(compiled.sql).toMatch(/picked\.object_id\s*>/);
    expect(compiled.sql).not.toMatch(/oc\.object_id\s*>/);
    expect(compiled.sql).toMatch(/::float8/);
    expect(compiled.sql).toContain('ORDER BY picked.weight DESC NULLS LAST, picked.object_id ASC');
  });

  const SAMPLE_BOX = { swLng: -123.2, swLat: 49.1, neLng: -123.0, neLat: 49.3 };

  it('listObjects binds ST_MakeEnvelope when box is applied', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.listObjects({
      tags: [],
      sort: 'rank',
      limit: 20,
      box: SAMPLE_BOX,
    });

    expect(executeQuery).toHaveBeenCalledTimes(1);
    const compiled = executeQuery.mock.calls[0][0] as { sql: string; parameters: unknown[] };
    expect(compiled.sql).toContain('ST_Intersects');
    expect(compiled.sql).toContain('ST_MakeEnvelope');
    expect(compiled.parameters).toEqual(
      expect.arrayContaining([-123.2, 49.1, -123.0, 49.3]),
    );
    expect(compiled.sql).toContain('4326');
  });

  it('listObjects omits geographic predicate when no box is applied', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.listObjects({ tags: [], sort: 'rank', limit: 20 });

    const compiled = executeQuery.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).not.toContain('ST_Intersects');
    expect(compiled.sql).not.toContain('ST_MakeEnvelope');
  });

  it('listObjects combines box with object type, text query and tag filters', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.listObjects({
      objectType: 'restaurant',
      q: 'sushi',
      tags: [{ category: 'Cuisine', value: 'Japanese' }],
      sort: 'rank',
      limit: 20,
      box: SAMPLE_BOX,
    });

    const compiled = executeQuery.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).toContain('oc.object_type =');
    expect(compiled.sql).toContain('object_tag_category_items');
    expect(compiled.sql).toContain('search_vector');
    expect(compiled.sql).toContain('to_tsquery');
    expect(compiled.sql).toContain('ST_MakeEnvelope');
  });

  it('listObjects text query includes name, identifier, and locality prefix paths', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.listObjects({
      objectType: 'restaurant',
      q: 'agassiz',
      tags: [],
      sort: 'rank',
      limit: 20,
    });

    const compiled = executeQuery.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).toContain('value_text_normalized');
    expect(compiled.sql).toContain("value_json->>'value'");
    expect(compiled.sql).toContain("value_json->>'locality'");
  });

  it('listObjects returns empty result when boxed query fails', async () => {
    const executeQuery = jest.fn().mockRejectedValue(new Error('db down'));
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    const result = await repo.listObjects({
      tags: [],
      sort: 'rank',
      limit: 20,
      box: SAMPLE_BOX,
    });

    expect(result).toEqual({ rows: [], hasMore: false });
  });

  it('getTagCategories with box skips redis cache', async () => {
    const redisGet = jest.fn();
    const redisSet = jest.fn();
    const redisFactory = {
      getClient: () => ({ get: redisGet, set: redisSet }),
    } as unknown as RedisClientFactory;

    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const db = createMockDb(execute);
    const repo = new DiscoverRepository(db as never, redisFactory);

    await repo.getTagCategories('restaurant', [], undefined, SAMPLE_BOX);

    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('listObjects newest and oldest order picked rows by created_at', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.listObjects({ tags: [], sort: 'newest', limit: 20 });
    await repo.listObjects({ tags: [], sort: 'oldest', limit: 20 });

    const newestSql = (executeQuery.mock.calls[0][0] as { sql: string }).sql;
    const oldestSql = (executeQuery.mock.calls[1][0] as { sql: string }).sql;
    expect(newestSql).toContain('ORDER BY picked.created_at DESC, picked.object_id ASC');
    expect(oldestSql).toContain('ORDER BY picked.created_at ASC, picked.object_id ASC');
    expect(newestSql).toContain('oc.created_at DESC, oc.object_id ASC');
    expect(oldestSql).toContain('oc.created_at ASC, oc.object_id ASC');
  });

  it('getTagCategories counts distinct meta groups over active objects', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.getTagCategories('product');
    await repo.getTagCategories('product', [{ category: 'Cuisine', value: 'Asian' }]);
    await repo.getTagCategories('product', [], 'burger');

    expect(executeQuery).toHaveBeenCalledTimes(3);
    for (const call of executeQuery.mock.calls) {
      const compiled = call[0] as { sql: string };
      expect(compiled.sql).toContain('COUNT(DISTINCT COALESCE(oc.meta_group_id, tci.object_id))');
      expect(compiled.sql).toContain('objects_core');
      expect(compiled.sql).toContain("oc.status = 'active'");
    }
  });

  it('getTagCategories with box applies geographic predicate', async () => {
    const executeQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = createQueryCapturingDb(executeQuery);
    const repo = new DiscoverRepository(db as never, emptyRedisFactory());

    await repo.getTagCategories('restaurant', [], undefined, SAMPLE_BOX);

    expect(executeQuery).toHaveBeenCalledTimes(1);
    const compiled = executeQuery.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).toContain('ST_MakeEnvelope');
    expect(compiled.sql).toContain('objects_core');
  });
});
