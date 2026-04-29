import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

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

function parentPathPrefixSql(parentPath: readonly string[]) {
  if (parentPath.length === 0) {
    return sql`ARRAY[]::text[]`;
  }
  return sql`ARRAY[${sql.join(
    parentPath.map((p) => sql`${p}`),
    sql`, `,
  )}]::text[]`;
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
  }): Promise<{ objectIds: string[]; nextCursor: string | null; hasMore: boolean }> {
    const account = params.username.trim();
    if (account.length === 0 || params.types.length === 0 || params.limit <= 0) {
      return { objectIds: [], nextCursor: null, hasMore: false };
    }

    const includePost = !params.hideLinkedObjects;

    const categoryFilter = params.uncategorizedOnly
      ? sql`(cat.category_names IS NULL OR cardinality(cat.category_names) = 0)`
      : categoryNamesContainPath(params.categoryPath);
    const cursor = params.cursor?.trim() ?? '';
    const take = params.limit + 1;

    const authorityTypeFilter =
      params.types.length === 0
        ? sql`FALSE`
        : sql`oc.object_type IN (${sql.join(params.types.map((t) => sql`${t}`), sql`, `)})`;

    const postPred = postLinkedPredicate(account, params.types, includePost, params.shopDeselectObjectIds);

    try {
      const rows = await sql<{ object_id: string }>`
        WITH authority_objects AS (
          SELECT DISTINCT oc.object_id
          FROM objects_core oc
          INNER JOIN object_authority oa ON oa.object_id = oc.object_id
            AND oa.account = ${account}
            AND oa.authority_type IN ('ownership', 'administrative')
            AND (${authorityTypeFilter})
        ),
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
          WHERE (${postPred})
        ),
        scoped_objects AS (
          SELECT DISTINCT obj.object_id
          FROM (
            SELECT object_id FROM authority_objects
            UNION
            SELECT object_id FROM post_linked_objects
          ) obj
          INNER JOIN objects_core oc ON oc.object_id = obj.object_id
          LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
          WHERE (${categoryFilter})
            AND (${cursor.length === 0 ? sql`TRUE` : sql`obj.object_id > ${cursor}`})
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

    const includePost = !params.hideLinkedObjects;
    const authorityTypeFilter =
      params.types.length === 0
        ? sql`FALSE`
        : sql`oc.object_type IN (${sql.join(params.types.map((t) => sql`${t}`), sql`, `)})`;

    const postPred = postLinkedPredicate(account, params.types, includePost, params.shopDeselectObjectIds);

    const parentArrSql = parentPathPrefixSql(params.parentPath);

    try {
      const rows = await sql<{ category_name: string; object_id: string }>`
        WITH authority_objects AS (
          SELECT DISTINCT oc.object_id
          FROM objects_core oc
          INNER JOIN object_authority oa ON oa.object_id = oc.object_id
            AND oa.account = ${account}
            AND oa.authority_type IN ('ownership', 'administrative')
            AND (${authorityTypeFilter})
        ),
        post_linked_objects AS (
          SELECT DISTINCT po.object_id
          FROM post_objects po
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
}
