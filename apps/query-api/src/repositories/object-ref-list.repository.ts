import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import {
  filterRelatedBackfillCategories,
  sortSimilarBackfillCategories,
} from '../domain/objects/object-ref-list-backfill';
import type { Database } from '../database';
import { KYSELY } from '../database';

export type ObjectRefListBackfillMode = 'related' | 'similar';

function objectTypesSupportingUpdate(updateType: string): string[] {
  return Object.entries(OBJECT_TYPE_REGISTRY)
    .filter(([, def]) => def.supported_updates.includes(updateType))
    .map(([key]) => key);
}

function sqlStringArray(values: readonly string[]) {
  if (values.length === 0) {
    return sql`ARRAY[]::text[]`;
  }
  return sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`;
}

@Injectable()
export class ObjectRefListRepository {
  private readonly logger = new Logger(ObjectRefListRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findCategoryNamesByObjectId(objectId: string): Promise<string[]> {
    try {
      const row = await this.db
        .selectFrom('object_categories')
        .where('object_id', '=', objectId)
        .select('category_names')
        .executeTakeFirst();
      return row?.category_names ?? [];
    } catch (error) {
      this.logger.error((error as Error).message);
      return [];
    }
  }

  async findMetaGroupIdsByObjectIds(objectIds: readonly string[]): Promise<string[]> {
    if (objectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.db
        .selectFrom('objects_core')
        .where('object_id', 'in', [...objectIds])
        .select(['object_id', 'meta_group_id'])
        .execute();
      const keys = new Set<string>();
      for (const row of rows) {
        keys.add(row.meta_group_id?.trim() || row.object_id);
      }
      return [...keys];
    } catch (error) {
      this.logger.error((error as Error).message);
      return [];
    }
  }

  async findGlobalCategoryCounts(
    categoryNames: readonly string[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (categoryNames.length === 0) {
      return out;
    }
    try {
      const rows = await this.db
        .selectFrom('object_categories_related')
        .where('scope_type', '=', 'global')
        .where('scope_key', '=', '_')
        .where('category_name', 'in', [...categoryNames])
        .select(['category_name', 'objects_count'])
        .execute();
      for (const row of rows) {
        out.set(row.category_name, Number(row.objects_count));
      }
      return out;
    } catch (error) {
      this.logger.error((error as Error).message);
      return out;
    }
  }

  /** Global counts with on-demand fallback when `object_categories_related` is stale or empty. */
  async resolveCategoryCountsForNames(
    categoryNames: readonly string[],
  ): Promise<Map<string, number>> {
    const counts = await this.findGlobalCategoryCounts(categoryNames);
    const missing = categoryNames.filter((name) => !counts.has(name));
    if (missing.length === 0) {
      return counts;
    }

    try {
      const rows = await sql<{ category_name: string; objects_count: number }>`
        SELECT
          cat_name AS category_name,
          COUNT(DISTINCT COALESCE(oc.meta_group_id, oc.object_id))::int AS objects_count
        FROM objects_core oc
        INNER JOIN object_categories cat ON cat.object_id = oc.object_id
        CROSS JOIN LATERAL unnest(cat.category_names) AS cat_name
        WHERE oc.status = 'active'
          AND cat_name IN (${sql.join(missing.map((name) => sql`${name}`), sql`, `)})
        GROUP BY cat_name
      `.execute(this.db);

      for (const row of rows.rows) {
        counts.set(row.category_name, Number(row.objects_count));
      }
      for (const name of missing) {
        if (!counts.has(name)) {
          counts.set(name, 0);
        }
      }
      return counts;
    } catch (error) {
      this.logger.error((error as Error).message);
      for (const name of missing) {
        counts.set(name, 0);
      }
      return counts;
    }
  }

  async findReverseAddOnObjectIds(params: {
    sourceId: string;
    excludeObjectIds: readonly string[];
    skip: number;
    limit: number;
  }): Promise<string[]> {
    const take = params.limit + 1;
    const exclude = new Set([params.sourceId, ...params.excludeObjectIds]);
    const excludeList = [...exclude];
    const objectTypes = objectTypesSupportingUpdate('addOn');

    try {
      const typeFilter =
        objectTypes.length === 0
          ? sql`FALSE`
          : sql`oc.object_type IN (${sql.join(objectTypes.map((t) => sql`${t}`), sql`, `)})`;

      const excludeFilter =
        excludeList.length === 0
          ? sql`TRUE`
          : sql`ou.object_id NOT IN (${sql.join(excludeList.map((id) => sql`${id}`), sql`, `)})`;

      const rows = await sql<{ object_id: string }>`
        SELECT DISTINCT ou.object_id
        FROM object_updates ou
        INNER JOIN objects_core oc ON oc.object_id = ou.object_id AND oc.status = 'active'
        WHERE ou.update_type = 'addOn'
          AND ou.value_text = ${params.sourceId}
          AND (${typeFilter})
          AND (${excludeFilter})
        ORDER BY oc.weight DESC NULLS LAST, ou.object_id ASC
        OFFSET ${params.skip}
        LIMIT ${take}
      `.execute(this.db);

      return rows.rows.map((r) => r.object_id);
    } catch (error) {
      this.logger.error((error as Error).message);
      return [];
    }
  }

  async findRelatedBackfillObjectIds(params: {
    sourceId: string;
    categoryNames: readonly string[];
    excludeObjectIds: readonly string[];
    excludeMetaGroupIds: readonly string[];
    skip: number;
    limit: number;
  }): Promise<string[]> {
    if (params.categoryNames.length === 0) {
      return [];
    }

    const counts = await this.resolveCategoryCountsForNames(params.categoryNames);
    const filteredCategories = filterRelatedBackfillCategories(params.categoryNames, counts);
    if (filteredCategories.length === 0) {
      return [];
    }

    return this.queryCategoryObjectIds({
      mode: 'related',
      sourceId: params.sourceId,
      categoryNames: filteredCategories,
      excludeObjectIds: params.excludeObjectIds,
      excludeMetaGroupIds: params.excludeMetaGroupIds,
      skip: params.skip,
      limit: params.limit,
    });
  }

  async findSimilarBackfillObjectIds(params: {
    sourceId: string;
    categoryNames: readonly string[];
    excludeObjectIds: readonly string[];
    excludeMetaGroupIds: readonly string[];
    skip: number;
    limit: number;
  }): Promise<string[]> {
    if (params.categoryNames.length === 0) {
      return [];
    }

    const counts = await this.resolveCategoryCountsForNames(params.categoryNames);
    const sortedCategories = sortSimilarBackfillCategories(params.categoryNames, counts);
    if (sortedCategories.length === 0) {
      return [];
    }

    const take = params.limit + 1;
    const collected: string[] = [];
    let updatedSkip = params.skip;
    const usedDepartments: string[] = [];

    for (const categoryName of sortedCategories) {
      if (collected.length >= take) {
        break;
      }

      const count = await this.countSimilarInCategory({
        sourceId: params.sourceId,
        categoryName,
        usedDepartments,
        excludeObjectIds: params.excludeObjectIds,
        excludeMetaGroupIds: params.excludeMetaGroupIds,
      });

      if (count === 0) {
        usedDepartments.push(categoryName);
        continue;
      }

      if (count <= updatedSkip) {
        usedDepartments.push(categoryName);
        updatedSkip -= count;
        continue;
      }

      const remaining = take - collected.length;
      const page = await this.querySimilarInCategory({
        sourceId: params.sourceId,
        categoryName,
        usedDepartments,
        excludeObjectIds: params.excludeObjectIds,
        excludeMetaGroupIds: params.excludeMetaGroupIds,
        skip: updatedSkip,
        limit: remaining,
      });

      collected.push(...page);
      usedDepartments.push(categoryName);
      updatedSkip = 0;
    }

    return collected;
  }

  private async countSimilarInCategory(params: {
    sourceId: string;
    categoryName: string;
    usedDepartments: readonly string[];
    excludeObjectIds: readonly string[];
    excludeMetaGroupIds: readonly string[];
  }): Promise<number> {
    const objectTypes = objectTypesSupportingUpdate('isSimilarTo');
    const typeFilter =
      objectTypes.length === 0
        ? sql`FALSE`
        : sql`oc.object_type IN (${sql.join(objectTypes.map((t) => sql`${t}`), sql`, `)})`;

    const excludeObjects = new Set([params.sourceId, ...params.excludeObjectIds]);
    const excludeObjectList = [...excludeObjects];
    const excludeObjectFilter =
      excludeObjectList.length === 0
        ? sql`TRUE`
        : sql`oc.object_id NOT IN (${sql.join(excludeObjectList.map((id) => sql`${id}`), sql`, `)})`;

    const excludeMetaFilter =
      params.excludeMetaGroupIds.length === 0
        ? sql`TRUE`
        : sql`COALESCE(oc.meta_group_id, oc.object_id) NOT IN (${sql.join(
            params.excludeMetaGroupIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;

    const usedFilter =
      params.usedDepartments.length === 0
        ? sql`TRUE`
        : sql`NOT (cat.category_names && ${sqlStringArray(params.usedDepartments)})`;

    try {
      const row = await sql<{ count: number }>`
        SELECT COUNT(*)::int AS count
        FROM objects_core oc
        INNER JOIN object_categories cat ON cat.object_id = oc.object_id
        WHERE oc.status = 'active'
          AND (${typeFilter})
          AND (${excludeObjectFilter})
          AND (${excludeMetaFilter})
          AND cat.category_names @> ARRAY[${params.categoryName}]::text[]
          AND (${usedFilter})
      `.execute(this.db);
      return Number(row.rows[0]?.count ?? 0);
    } catch (error) {
      this.logger.error((error as Error).message);
      return 0;
    }
  }

  private async querySimilarInCategory(params: {
    sourceId: string;
    categoryName: string;
    usedDepartments: readonly string[];
    excludeObjectIds: readonly string[];
    excludeMetaGroupIds: readonly string[];
    skip: number;
    limit: number;
  }): Promise<string[]> {
    const objectTypes = objectTypesSupportingUpdate('isSimilarTo');
    const typeFilter =
      objectTypes.length === 0
        ? sql`FALSE`
        : sql`oc.object_type IN (${sql.join(objectTypes.map((t) => sql`${t}`), sql`, `)})`;

    const excludeObjects = new Set([params.sourceId, ...params.excludeObjectIds]);
    const excludeObjectList = [...excludeObjects];
    const excludeObjectFilter =
      excludeObjectList.length === 0
        ? sql`TRUE`
        : sql`oc.object_id NOT IN (${sql.join(excludeObjectList.map((id) => sql`${id}`), sql`, `)})`;

    const excludeMetaFilter =
      params.excludeMetaGroupIds.length === 0
        ? sql`TRUE`
        : sql`COALESCE(oc.meta_group_id, oc.object_id) NOT IN (${sql.join(
            params.excludeMetaGroupIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;

    const usedFilter =
      params.usedDepartments.length === 0
        ? sql`TRUE`
        : sql`NOT (cat.category_names && ${sqlStringArray(params.usedDepartments)})`;

    const rows = await sql<{ object_id: string }>`
      SELECT oc.object_id
      FROM objects_core oc
      INNER JOIN object_categories cat ON cat.object_id = oc.object_id
      WHERE oc.status = 'active'
        AND (${typeFilter})
        AND (${excludeObjectFilter})
        AND (${excludeMetaFilter})
        AND cat.category_names @> ARRAY[${params.categoryName}]::text[]
        AND (${usedFilter})
      ORDER BY oc.weight DESC NULLS LAST, oc.object_id ASC
      OFFSET ${params.skip}
      LIMIT ${params.limit + 1}
    `.execute(this.db);

    return rows.rows.map((r) => r.object_id);
  }

  private async queryCategoryObjectIds(params: {
    mode: ObjectRefListBackfillMode;
    sourceId: string;
    categoryNames: readonly string[];
    excludeObjectIds: readonly string[];
    excludeMetaGroupIds: readonly string[];
    skip: number;
    limit: number;
  }): Promise<string[]> {
    const updateType = params.mode === 'related' ? 'isRelatedTo' : 'isSimilarTo';
    const objectTypes = objectTypesSupportingUpdate(updateType);
    if (objectTypes.length === 0 || params.categoryNames.length === 0) {
      return [];
    }

    const excludeObjects = new Set([params.sourceId, ...params.excludeObjectIds]);
    const excludeObjectList = [...excludeObjects];

    try {
      const rows = await sql<{ object_id: string }>`
        SELECT oc.object_id
        FROM objects_core oc
        INNER JOIN object_categories cat ON cat.object_id = oc.object_id
        WHERE oc.status = 'active'
          AND oc.object_type IN (${sql.join(objectTypes.map((t) => sql`${t}`), sql`, `)})
          AND oc.object_id NOT IN (${sql.join(excludeObjectList.map((id) => sql`${id}`), sql`, `)})
          AND cat.category_names && ${sqlStringArray(params.categoryNames)}
          ${
            params.excludeMetaGroupIds.length === 0
              ? sql``
              : sql`AND COALESCE(oc.meta_group_id, oc.object_id) NOT IN (${sql.join(
                  params.excludeMetaGroupIds.map((id) => sql`${id}`),
                  sql`, `,
                )})`
          }
        ORDER BY oc.weight DESC NULLS LAST, oc.object_id ASC
        OFFSET ${params.skip}
        LIMIT ${params.limit + 1}
      `.execute(this.db);

      return rows.rows.map((r) => r.object_id);
    } catch (error) {
      this.logger.error((error as Error).message);
      return [];
    }
  }
}
