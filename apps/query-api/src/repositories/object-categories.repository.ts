import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { CategoryObjectsCursorPayload } from '../domain/categories/category-objects-cursor';
import {
  authorityObjectsCte,
  buildShopObjectFilterClause,
  buildShopScopeCtes,
  parentPathPrefixSql,
  type ShopScopeParams,
  type ShopTagCategoryRow,
  type ShopTagFilter,
} from './shop-scope.sql';

function sqlStringArray(values: readonly string[]) {
  if (values.length === 0) {
    return sql`ARRAY[]::text[]`;
  }
  return sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`;
}

@Injectable()
export class ObjectCategoriesRepository {
  private readonly logger = new Logger(ObjectCategoriesRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Flat paginated list — cursor is last `object_id` from the previous page (lexicographic).
   */
  async findObjectIdsByScope(params: {
    username: string;
    types: string[];
    categoryPath: string[];
    uncategorizedOnly: boolean;
    limit: number;
    cursor: string | null;
    hideLinkedObjects: boolean;
    shopDeselectObjectIds: string[];
    tags?: ShopTagFilter[];
    rating?: number | null;
  }): Promise<{ objectIds: string[]; nextCursor: string | null; hasMore: boolean }> {
    const account = params.username.trim();
    if (account.length === 0 || params.types.length === 0 || params.limit <= 0) {
      return { objectIds: [], nextCursor: null, hasMore: false };
    }

    const scope: ShopScopeParams = {
      account,
      types: params.types,
      categoryPath: params.categoryPath,
      uncategorizedOnly: params.uncategorizedOnly,
      hideLinkedObjects: params.hideLinkedObjects,
      shopDeselectObjectIds: params.shopDeselectObjectIds,
    };
    const tags = params.tags ?? [];
    const objectFilter = buildShopObjectFilterClause(sql`obj.object_id`, tags, params.rating ?? null);
    const { authorityTypeFilter, postPred, categoryFilter, cursorFilter } = buildShopScopeCtes(
      scope,
      { objectFilter, cursorObjectId: params.cursor },
    );
    const take = params.limit + 1;

    try {
      const rows = await sql<{ object_id: string }>`
        WITH ${authorityObjectsCte(account, authorityTypeFilter)},
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
          WHERE (${postPred})
        ),
        scoped_objects AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
          INNER JOIN objects_core oc ON oc.object_id = obj.object_id AND oc.status = 'active'
          LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
          WHERE (${categoryFilter})
            AND (${objectFilter})
            AND (${cursorFilter})
        )
        SELECT object_id
        FROM scoped_objects
        ORDER BY object_id ASC
        LIMIT ${take}
      `.execute(this.db);

      const ids = rows.rows.map((r) => r.object_id);
      const hasMore = ids.length > params.limit;
      const page = hasMore ? ids.slice(0, params.limit) : ids;
      const lastId = page.length > 0 ? page[page.length - 1] : undefined;
      const nextCursor = hasMore && lastId != null ? lastId : null;
      return { objectIds: page, nextCursor, hasMore };
    } catch (error) {
      this.logger.error(
        `findObjectIdsByScope failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { objectIds: [], nextCursor: null, hasMore: false };
    }
  }

  /**
   * Up to `objectsPerCategory` object ids per category name (full path = parentPath + name).
   */
  async findObjectIdsByScopeForCategories(params: {
    username: string;
    types: string[];
    categoryNames: string[];
    parentPath: string[];
    objectsPerCategory: number;
    hideLinkedObjects: boolean;
    shopDeselectObjectIds: string[];
    tags?: ShopTagFilter[];
    rating?: number | null;
  }): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    for (const n of params.categoryNames) {
      result.set(n, []);
    }

    const account = params.username.trim();
    if (
      account.length === 0 ||
      params.types.length === 0 ||
      params.categoryNames.length === 0 ||
      params.objectsPerCategory <= 0
    ) {
      return result;
    }

    const scope: ShopScopeParams = {
      account,
      types: params.types,
      categoryPath: [],
      uncategorizedOnly: false,
      hideLinkedObjects: params.hideLinkedObjects,
      shopDeselectObjectIds: params.shopDeselectObjectIds,
    };
    const tags = params.tags ?? [];
    const objectFilter = buildShopObjectFilterClause(sql`b.object_id`, tags, params.rating ?? null);
    const { authorityTypeFilter, postPred } = buildShopScopeCtes(scope);
    const parentArrSql = parentPathPrefixSql(params.parentPath);

    try {
      const rows = await sql<{ category_name: string; object_id: string }>`
        WITH ${authorityObjectsCte(account, authorityTypeFilter)},
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
          WHERE (${postPred})
        ),
        base_scope AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
        ),
        cats AS (
          SELECT candidate_name
          FROM unnest(${params.categoryNames}::text[]) AS candidate_name
        )
        SELECT c.candidate_name AS category_name, s.object_id
        FROM cats c
        CROSS JOIN LATERAL (
          SELECT b.object_id
          FROM base_scope b
          INNER JOIN object_categories cat ON cat.object_id = b.object_id
          WHERE cat.category_names @> (${parentArrSql} || ARRAY[c.candidate_name]::text[])
            AND (${objectFilter})
          ORDER BY b.object_id ASC
          LIMIT ${params.objectsPerCategory}
        ) s
      `.execute(this.db);

      for (const row of rows.rows) {
        const list = result.get(row.category_name) ?? [];
        list.push(row.object_id);
        result.set(row.category_name, list);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `findObjectIdsByScopeForCategories failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return result;
    }
  }

  /** Filtered object counts per category name (full path = parentPath + name). */
  async countObjectIdsByScopeForCategories(params: {
    username: string;
    types: string[];
    categoryNames: string[];
    parentPath: string[];
    hideLinkedObjects: boolean;
    shopDeselectObjectIds: string[];
    tags?: ShopTagFilter[];
    rating?: number | null;
  }): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const n of params.categoryNames) {
      result.set(n, 0);
    }

    const account = params.username.trim();
    if (
      account.length === 0 ||
      params.types.length === 0 ||
      params.categoryNames.length === 0
    ) {
      return result;
    }

    const scope: ShopScopeParams = {
      account,
      types: params.types,
      categoryPath: [],
      uncategorizedOnly: false,
      hideLinkedObjects: params.hideLinkedObjects,
      shopDeselectObjectIds: params.shopDeselectObjectIds,
    };
    const tags = params.tags ?? [];
    const objectFilter = buildShopObjectFilterClause(sql`b.object_id`, tags, params.rating ?? null);
    const { authorityTypeFilter, postPred } = buildShopScopeCtes(scope);
    const parentArrSql = parentPathPrefixSql(params.parentPath);

    try {
      const rows = await sql<{ category_name: string; object_count: number | string }>`
        WITH ${authorityObjectsCte(account, authorityTypeFilter)},
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
          WHERE (${postPred})
        ),
        base_scope AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
        ),
        cats AS (
          SELECT candidate_name
          FROM unnest(${params.categoryNames}::text[]) AS candidate_name
        )
        SELECT
          c.candidate_name AS category_name,
          COUNT(DISTINCT b.object_id)::int AS object_count
        FROM cats c
        INNER JOIN object_categories cat
          ON cat.category_names @> (${parentArrSql} || ARRAY[c.candidate_name]::text[])
        INNER JOIN base_scope b
          ON b.object_id = cat.object_id
          AND (${objectFilter})
        GROUP BY c.candidate_name
      `.execute(this.db);

      for (const row of rows.rows) {
        result.set(row.category_name, Number(row.object_count));
      }
      return result;
    } catch (error) {
      this.logger.error(
        `countObjectIdsByScopeForCategories failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return result;
    }
  }

  /** Filtered uncategorized object count in user shop scope (empty `category_names`). */
  async countUncategorizedObjectIdsByScope(params: {
    username: string;
    types: string[];
    hideLinkedObjects: boolean;
    shopDeselectObjectIds: string[];
    tags?: ShopTagFilter[];
    rating?: number | null;
  }): Promise<number> {
    const account = params.username.trim();
    if (account.length === 0 || params.types.length === 0) {
      return 0;
    }

    const scope: ShopScopeParams = {
      account,
      types: params.types,
      categoryPath: [],
      uncategorizedOnly: true,
      hideLinkedObjects: params.hideLinkedObjects,
      shopDeselectObjectIds: params.shopDeselectObjectIds,
    };
    const tags = params.tags ?? [];
    const objectFilter = buildShopObjectFilterClause(sql`obj.object_id`, tags, params.rating ?? null);
    const { authorityTypeFilter, postPred, categoryFilter } = buildShopScopeCtes(scope, {
      objectFilter,
    });

    try {
      const result = await sql<{ object_count: number | string }>`
        WITH ${authorityObjectsCte(account, authorityTypeFilter)},
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
          WHERE (${postPred})
        ),
        scoped_objects AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
          INNER JOIN objects_core oc ON oc.object_id = obj.object_id AND oc.status = 'active'
          LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
          WHERE (${categoryFilter})
            AND (${objectFilter})
        )
        SELECT COUNT(*)::int AS object_count
        FROM scoped_objects
      `.execute(this.db);

      return Number(result.rows[0]?.object_count ?? 0);
    } catch (error) {
      this.logger.error(
        `countUncategorizedObjectIdsByScope failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  /** Tag facet rows for objects in user shop scope (optionally narrowed by active tags/rating). */
  async getShopTagCategories(
    scope: ShopScopeParams,
    activeTags: ShopTagFilter[] = [],
    ratingThreshold: number | null = null,
  ): Promise<ShopTagCategoryRow[]> {
    const account = scope.account.trim();
    if (account.length === 0 || scope.types.length === 0) {
      return [];
    }

    const { authorityTypeFilter, postPred, categoryFilter } = buildShopScopeCtes(scope);
    const needsNarrowing = activeTags.length > 0 || ratingThreshold != null;

    try {
      if (needsNarrowing) {
        const narrowingFilter = buildShopObjectFilterClause(
          sql`so.object_id`,
          activeTags,
          ratingThreshold,
        );

        const result = await sql<ShopTagCategoryRow>`
          WITH ${authorityObjectsCte(account, authorityTypeFilter)},
          post_linked_objects AS (
            SELECT DISTINCT po.object_id
            FROM post_objects po
            INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
            WHERE (${postPred})
          ),
          scoped_objects AS (
            SELECT DISTINCT obj.object_id
            FROM (
              SELECT object_id FROM authority_objects
              UNION
              SELECT object_id FROM post_linked_objects
            ) obj
            INNER JOIN objects_core oc ON oc.object_id = obj.object_id AND oc.status = 'active'
            LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
            WHERE (${categoryFilter})
          ),
          narrowed_objects AS (
            SELECT so.object_id
            FROM scoped_objects so
            WHERE (${narrowingFilter})
          )
          SELECT
            tci.category AS category,
            tci.value AS tag_value,
            COUNT(DISTINCT tci.object_id)::int AS object_count
          FROM object_tag_category_items tci
          INNER JOIN narrowed_objects no ON no.object_id = tci.object_id
          GROUP BY 1, 2
          ORDER BY 1 ASC, 3 DESC, 2 ASC
        `.execute(this.db);

        return result.rows.map((row) => ({
          category: row.category,
          tag_value: row.tag_value,
          object_count: Number(row.object_count),
        }));
      }

      const result = await sql<ShopTagCategoryRow>`
        WITH ${authorityObjectsCte(account, authorityTypeFilter)},
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          INNER JOIN objects_core oc ON oc.object_id = po.object_id AND oc.status = 'active'
          WHERE (${postPred})
        ),
        scoped_objects AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
          INNER JOIN objects_core oc ON oc.object_id = obj.object_id AND oc.status = 'active'
          LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
          WHERE (${categoryFilter})
        )
        SELECT
          tci.category AS category,
          tci.value AS tag_value,
          COUNT(DISTINCT tci.object_id)::int AS object_count
        FROM object_tag_category_items tci
        INNER JOIN scoped_objects so ON so.object_id = tci.object_id
        GROUP BY 1, 2
        ORDER BY 1 ASC, 3 DESC, 2 ASC
      `.execute(this.db);

      return result.rows.map((row) => ({
        category: row.category,
        tag_value: row.tag_value,
        object_count: Number(row.object_count),
      }));
    } catch (error) {
      this.logger.error(
        `getShopTagCategories failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Global active objects whose `category_names` contain `categoryName` (array overlap).
   * Collapses product variants by `meta_group_id`; orders by weight DESC NULLS LAST.
   */
  async findObjectIdsByCategoryName(params: {
    categoryName: string;
    limit: number;
    cursor: CategoryObjectsCursorPayload | null;
    excludeObjectId?: string;
  }): Promise<{
    rows: { object_id: string; weight: number | null }[];
    hasMore: boolean;
  }> {
    const name = params.categoryName.trim();
    if (name.length === 0 || params.limit <= 0) {
      return { rows: [], hasMore: false };
    }

    const fetchLimit = params.limit + 1;
    const excludeId = params.excludeObjectId?.trim() || null;
    const cursor = params.cursor;

    const cursorFilter =
      cursor != null
        ? sql`AND (
          COALESCE(picked.weight, -1) < COALESCE(${cursor.weight}, -1)
          OR (
            COALESCE(picked.weight, -1) = COALESCE(${cursor.weight}, -1)
            AND picked.object_id < ${cursor.object_id}
          )
        )`
        : sql``;

    const excludeFilter =
      excludeId != null && excludeId.length > 0
        ? sql`AND oc.object_id <> ${excludeId}`
        : sql``;

    const nameArray = sqlStringArray([name]);

    const result = await sql<{ object_id: string; weight: number | null }>`
      WITH picked AS (
        SELECT DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))
          oc.object_id AS object_id,
          oc.weight AS weight
        FROM objects_core oc
        INNER JOIN object_categories cat ON cat.object_id = oc.object_id
        WHERE oc.status = 'active'
          AND cat.category_names && ${nameArray}
          ${excludeFilter}
        ORDER BY COALESCE(oc.meta_group_id, oc.object_id), oc.weight DESC NULLS LAST, oc.object_id ASC
      )
      SELECT picked.object_id AS object_id, picked.weight AS weight
      FROM picked
      WHERE TRUE
        ${cursorFilter}
      ORDER BY picked.weight DESC NULLS LAST, picked.object_id ASC
      LIMIT ${fetchLimit}
    `.execute(this.db);

    const hasMore = result.rows.length > params.limit;
    const rows = hasMore ? result.rows.slice(0, params.limit) : result.rows;
    return { rows, hasMore };
  }
}
