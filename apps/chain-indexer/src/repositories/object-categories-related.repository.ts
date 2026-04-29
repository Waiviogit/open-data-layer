import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import {
  UNCATEGORIZED_CATEGORY_SENTINEL,
  type NewObjectCategoriesRelatedRow,
  type ObjectCategoriesRelatedScopeType,
} from '@opden-data-layer/core';

type AggregationRowRaw = {
  category_name: string;
  objects_count: bigint;
  group_keys: string[];
  related_names: string[];
};

export type UserShopScopeAggOptions = {
  account: string;
  types: readonly string[];
  /** When false, the post-linked branch contributes no rows. */
  includePostObjects: boolean;
  /** Applies only to post-linked rows (not authority). */
  shopDeselectObjectIds: readonly string[];
};

/**
 * Aggregation SQL and replace for `object_categories_related` rows (per-scope full refresh).
 */
@Injectable()
export class ObjectCategoriesRelatedRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * User shop scope: `(ownership OR administrative)` union post-linked rows (minus deselect on link branch only).
   */
  async replaceUserShopScope(scopeKeyFull: string, opts: UserShopScopeAggOptions): Promise<void> {
    const key = scopeKeyFull.trim();
    if (key.length === 0 || opts.account.trim().length === 0 || opts.types.length === 0) {
      return;
    }
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('object_categories_related')
        .where('scope_type', '=', 'user')
        .where('scope_key', '=', key)
        .execute();

      const rows = await this.loadUserShopScopeRows(trx, key, opts);
      if (rows.length > 0) {
        await trx.insertInto('object_categories_related').values(rows).execute();
      }
    });
  }

  /** Global catalogue scope (`group_keys` stored empty arrays). */
  async replaceGlobalScope(): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('object_categories_related')
        .where('scope_type', '=', 'global')
        .where('scope_key', '=', '_')
        .execute();

      const rows = await this.loadGlobalScopeRows(trx);
      if (rows.length > 0) {
        await trx.insertInto('object_categories_related').values(rows).execute();
      }
    });
  }

  private postLinkedPredicate(
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

    return sql`po.author = ${account} AND po.object_type IN (${typeList}) AND (${deselectClause})`;
  }

  private async loadUserShopScopeRows(
    trx: Kysely<Database>,
    scopeKeyFull: string,
    opts: UserShopScopeAggOptions,
  ): Promise<NewObjectCategoriesRelatedRow[]> {
    const { account, types, includePostObjects, shopDeselectObjectIds } = opts;
    const sentinel = UNCATEGORIZED_CATEGORY_SENTINEL;

    const authorityTypeFilter =
      types.length === 0
        ? sql`FALSE`
        : sql`oc.object_type IN (${sql.join(types.map((t) => sql`${t}`), sql`, `)})`;

    const postPred = this.postLinkedPredicate(
      account.trim(),
      types,
      includePostObjects,
      shopDeselectObjectIds,
    );

    const { rows } = await sql<AggregationRowRaw>`
      WITH authority_objects AS (
        SELECT DISTINCT oc.object_id
        FROM objects_core oc
        INNER JOIN object_authority oa ON oa.object_id = oc.object_id
          AND oa.account = ${account.trim()}
          AND oa.authority_type IN ('ownership', 'administrative')
          AND (${authorityTypeFilter})
      ),
      post_linked_objects AS (
        SELECT DISTINCT po.object_id
        FROM post_objects po
        WHERE (${postPred})
      ),
      scoped_objects AS (
        SELECT DISTINCT obj.object_id,
          COALESCE(oc.meta_group_id, oc.object_id) AS group_key,
          cat.category_names AS category_names
        FROM (
          SELECT object_id FROM authority_objects
          UNION
          SELECT object_id FROM post_linked_objects
        ) obj
        INNER JOIN objects_core oc ON oc.object_id = obj.object_id
        LEFT JOIN object_categories cat ON cat.object_id = obj.object_id
      ),
      exploded AS (
        SELECT
          so.group_key,
          u.cat_name AS cat_name
        FROM scoped_objects so
        CROSS JOIN LATERAL unnest(
          CASE
            WHEN so.category_names IS NOT NULL AND cardinality(so.category_names) > 0
            THEN so.category_names
            ELSE ARRAY[]::text[]
          END
        ) AS u(cat_name)
      ),
      group_keys_per_cat AS (
        SELECT cat_name, array_agg(DISTINCT group_key ORDER BY group_key) AS group_keys
        FROM exploded
        GROUP BY cat_name
      ),
      related_per_cat AS (
        SELECT
          e1.cat_name,
          array_agg(DISTINCT e2.cat_name ORDER BY e2.cat_name)
            FILTER (WHERE e2.cat_name <> e1.cat_name) AS related_names
        FROM exploded e1
        INNER JOIN exploded e2 ON e1.group_key = e2.group_key
        GROUP BY e1.cat_name
      ),
      uncategorized AS (
        SELECT COUNT(DISTINCT group_key)::bigint AS cnt
        FROM scoped_objects
        WHERE category_names IS NULL OR cardinality(category_names) = 0
      )
      SELECT
        g.cat_name AS category_name,
        cardinality(g.group_keys)::bigint AS objects_count,
        g.group_keys AS group_keys,
        COALESCE(r.related_names, ARRAY[]::text[]) AS related_names
      FROM group_keys_per_cat g
      LEFT JOIN related_per_cat r ON r.cat_name = g.cat_name
      UNION ALL
      SELECT
        ${sentinel}::text,
        u.cnt,
        ARRAY[]::text[],
        ARRAY[]::text[]
      FROM uncategorized u
    `.execute(trx);

    return rows.map((r) =>
      this.rowToInsert(
        'user',
        scopeKeyFull,
        r.category_name,
        r.objects_count,
        r.group_keys,
        r.related_names,
      ),
    );
  }

  private async loadGlobalScopeRows(
    trx: Kysely<Database>,
  ): Promise<NewObjectCategoriesRelatedRow[]> {
    const sentinel = UNCATEGORIZED_CATEGORY_SENTINEL;
    const { rows } = await sql<AggregationRowRaw>`
      WITH scoped_objects AS (
        SELECT
          oc.object_id,
          COALESCE(oc.meta_group_id, oc.object_id) AS group_key,
          cat.category_names
        FROM objects_core oc
        LEFT JOIN object_categories cat ON cat.object_id = oc.object_id
      ),
      exploded AS (
        SELECT
          so.group_key,
          u.cat_name AS cat_name
        FROM scoped_objects so
        CROSS JOIN LATERAL unnest(
          CASE
            WHEN so.category_names IS NOT NULL AND cardinality(so.category_names) > 0
            THEN so.category_names
            ELSE ARRAY[]::text[]
          END
        ) AS u(cat_name)
      ),
      cnt_per_cat AS (
        SELECT cat_name, COUNT(DISTINCT group_key)::bigint AS objects_count
        FROM exploded
        GROUP BY cat_name
      ),
      related_per_cat AS (
        SELECT
          e1.cat_name,
          array_agg(DISTINCT e2.cat_name ORDER BY e2.cat_name)
            FILTER (WHERE e2.cat_name <> e1.cat_name) AS related_names
        FROM exploded e1
        INNER JOIN exploded e2 ON e1.group_key = e2.group_key
        GROUP BY e1.cat_name
      ),
      uncategorized AS (
        SELECT COUNT(DISTINCT group_key)::bigint AS cnt
        FROM scoped_objects
        WHERE category_names IS NULL OR cardinality(category_names) = 0
      )
      SELECT
        c.cat_name AS category_name,
        c.objects_count,
        ARRAY[]::text[] AS group_keys,
        COALESCE(r.related_names, ARRAY[]::text[]) AS related_names
      FROM cnt_per_cat c
      LEFT JOIN related_per_cat r ON r.cat_name = c.cat_name
      UNION ALL
      SELECT
        ${sentinel}::text,
        u.cnt,
        ARRAY[]::text[],
        ARRAY[]::text[]
      FROM uncategorized u
    `.execute(trx);

    return rows.map((r) =>
      this.rowToInsert(
        'global',
        '_',
        r.category_name,
        r.objects_count,
        r.group_keys,
        r.related_names,
      ),
    );
  }

  private rowToInsert(
    scopeType: ObjectCategoriesRelatedScopeType,
    scopeKey: string,
    categoryName: string,
    objectsCount: bigint,
    groupKeys: string[],
    relatedNames: string[],
  ): NewObjectCategoriesRelatedRow {
    return {
      scope_type: scopeType,
      scope_key: scopeKey,
      category_name: categoryName,
      objects_count:
        typeof objectsCount === 'bigint'
          ? Number(objectsCount)
          : Number(objectsCount),
      group_keys: groupKeys,
      related_names: relatedNames,
    };
  }
}
