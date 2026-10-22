import { sql, type RawBuilder } from 'kysely';

export type ShopScopeParams = {
  account: string;
  types: readonly string[];
  categoryPath: readonly string[];
  uncategorizedOnly: boolean;
  hideLinkedObjects: boolean;
  shopDeselectObjectIds: readonly string[];
};

export type ShopTagFilter = {
  category: string;
  value: string;
};

function postLinkedPredicate(
  account: string,
  types: readonly string[],
  includePostObjects: boolean,
  shopDeselectIds: readonly string[],
) {
  if (!includePostObjects || types.length === 0) {
    return sql`FALSE`;
  }
  const typeList = sql.join(types.map((t) => sql`${t}`), sql`, `);
  const deselectClause =
    shopDeselectIds.length === 0
      ? sql`TRUE`
      : sql`NOT (po.object_id IN (${sql.join(
          shopDeselectIds.map((id) => sql`${id}`),
          sql`, `,
        )}))`;
  return sql`po.author = ${account.trim()} AND po.object_type IN (${typeList}) AND (${deselectClause})`;
}

function categoryNamesContainPath(categoryPath: readonly string[]) {
  if (categoryPath.length === 0) {
    return sql`TRUE`;
  }
  return sql`cat.category_names @> ARRAY[${sql.join(
    categoryPath.map((p) => sql`${p}`),
    sql`, `,
  )}]::text[]`;
}

export function shopTagExistsFragments(
  objectIdColumn: RawBuilder<unknown>,
  tags: readonly ShopTagFilter[],
): RawBuilder<unknown>[] {
  return tags.map(
    ({ category, value }) => sql`EXISTS (
      SELECT 1 FROM object_tag_category_items tci
      WHERE tci.object_id = ${objectIdColumn}
        AND tci.category = ${category}
        AND tci.value = ${value}
    )`,
  );
}

export function shopRatingExistsFragment(
  objectIdColumn: RawBuilder<unknown>,
  ratingThreshold: number,
): RawBuilder<unknown> {
  const minRank = ratingThreshold * 1000;
  return sql`EXISTS (
    SELECT 1 FROM object_updates ou
    WHERE ou.object_id = ${objectIdColumn}
      AND ou.update_type = 'aggregateRating'
      AND COALESCE(
        ou.rank_score,
        (
          SELECT ROUND(AVG(rv.rank))::int
          FROM rank_votes rv
          WHERE rv.update_id = ou.update_id
        )
      ) >= ${minRank}
  )`;
}

export function buildShopObjectFilterClause(
  objectIdColumn: RawBuilder<unknown>,
  tags: readonly ShopTagFilter[],
  ratingThreshold: number | null,
): RawBuilder<unknown> {
  const parts: RawBuilder<unknown>[] = [...shopTagExistsFragments(objectIdColumn, tags)];
  if (ratingThreshold != null) {
    parts.push(shopRatingExistsFragment(objectIdColumn, ratingThreshold));
  }
  if (parts.length === 0) {
    return sql`TRUE`;
  }
  return sql.join(parts, sql` AND `);
}

/** Shared CTE names: authority_objects, post_linked_objects, scoped_objects. */
export function buildShopScopeCtes(
  scope: ShopScopeParams,
  options?: {
    objectFilter?: RawBuilder<unknown>;
    cursorObjectId?: string | null;
  },
): {
  authorityTypeFilter: RawBuilder<unknown>;
  postPred: RawBuilder<unknown>;
  categoryFilter: RawBuilder<unknown>;
  objectFilter: RawBuilder<unknown>;
  cursorFilter: RawBuilder<unknown>;
} {
  const account = scope.account.trim();
  const includePost = !scope.hideLinkedObjects;
  const authorityTypeFilter =
    scope.types.length === 0
      ? sql`FALSE`
      : sql`oc.object_type IN (${sql.join(scope.types.map((t) => sql`${t}`), sql`, `)})`;
  const postPred = postLinkedPredicate(
    account,
    scope.types,
    includePost,
    scope.shopDeselectObjectIds,
  );
  const categoryFilter = scope.uncategorizedOnly
    ? sql`(cat.category_names IS NULL OR cardinality(cat.category_names) = 0)`
    : categoryNamesContainPath(scope.categoryPath);
  const objectFilter = options?.objectFilter ?? sql`TRUE`;
  const cursor = options?.cursorObjectId?.trim() ?? '';
  const cursorFilter = cursor.length === 0 ? sql`TRUE` : sql`obj.object_id > ${cursor}`;

  return { authorityTypeFilter, postPred, categoryFilter, objectFilter, cursorFilter };
}

/** Favorites ∪ ownership, both restricted to `scope.types` (same as chain-indexer). */
export function authorityObjectsCte(
  account: string,
  authorityTypeFilter: RawBuilder<unknown>,
): RawBuilder<unknown> {
  return sql`authority_objects AS (
    SELECT DISTINCT oc.object_id
    FROM objects_core oc
    INNER JOIN object_favorite of ON of.object_id = oc.object_id
      AND of.account = ${account}
      AND (${authorityTypeFilter})
      AND oc.status = 'active'
    UNION
    SELECT DISTINCT oc.object_id
    FROM objects_core oc
    INNER JOIN object_ownership oo ON oo.object_id = oc.object_id
      AND oo.account = ${account}
      AND (${authorityTypeFilter})
      AND oc.status = 'active'
  )`;
}

export function parentPathPrefixSql(parentPath: readonly string[]) {
  if (parentPath.length === 0) {
    return sql`ARRAY[]::text[]`;
  }
  return sql`ARRAY[${sql.join(
    parentPath.map((p) => sql`${p}`),
    sql`, `,
  )}]::text[]`;
}

export type ShopTagCategoryRow = {
  category: string;
  tag_value: string;
  object_count: number;
};
