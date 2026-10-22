import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  sql,
  type RawBuilder,
} from 'kysely';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';

import { shopRatingThresholdToRank } from '../domain/shop/shop.constants';
import { authorityObjectsCte, buildShopScopeCtes } from './shop-scope.sql';

function compileSql(fragment: RawBuilder<unknown>): {
  sql: string;
  parameters: readonly unknown[];
} {
  const db = new Kysely<OdlDatabase>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (kysely) => new PostgresIntrospector(kysely),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
  return fragment.compile(db);
}

describe('shop-scope.sql rating filter', () => {
  it('maps legacy threshold 6 to rank_score 6000 (5★ object passes rating=6 filter)', () => {
    expect(shopRatingThresholdToRank(6)).toBe(6000);
    expect(shopRatingThresholdToRank(8)).toBe(8000);
    expect(shopRatingThresholdToRank(10)).toBe(10000);
  });
});

describe('authorityObjectsCte', () => {
  it('applies object_type filter to both favorites and ownership', () => {
    const { authorityTypeFilter } = buildShopScopeCtes({
      account: 'wiv01',
      types: ['recipe'],
      categoryPath: [],
      uncategorizedOnly: false,
      hideLinkedObjects: true,
      shopDeselectObjectIds: [],
    });
    const compiled = compileSql(sql`WITH ${authorityObjectsCte('wiv01', authorityTypeFilter)} SELECT 1`);
    const ownershipIdx = compiled.sql.indexOf('object_ownership');
    const favoriteIdx = compiled.sql.indexOf('object_favorite');
    expect(favoriteIdx).toBeGreaterThan(-1);
    expect(ownershipIdx).toBeGreaterThan(favoriteIdx);
    const afterOwnership = compiled.sql.slice(ownershipIdx);
    expect(afterOwnership).toMatch(/object_type\s+in/i);
    expect(compiled.parameters).toEqual(expect.arrayContaining(['wiv01', 'recipe']));
  });
});
