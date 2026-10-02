import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import {
  DISCOVER_TAG_CATEGORIES_CACHE_TTL_SEC,
} from '../constants/discover.constants';
import { redisKey } from '../constants/redis-keys';
import type { Database } from '../database';
import { KYSELY } from '../database';
import {
  decodeDiscoverObjectCursor,
  decodeDiscoverUserCursor,
  encodeDiscoverObjectCursor,
  encodeDiscoverUserCursor,
} from '../domain/discover/discover-cursor';
import type { DiscoverSort, DiscoverBox } from '../domain/discover/discover-query.schema';
import { buildAutocompleteTsQuery } from './search-fts.utils';
import { prefixUpperBound, shouldSearchObjectIdSubstring, shouldSearchPrefix } from './search-prefix.utils';

const FTS_TEXT_UPDATE_TYPES = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.DESCRIPTION,
] as const;

export interface DiscoverObjectCandidateRow {
  object_id: string;
  created_at: Date;
  weight: number | null;
}

function createdAtToIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString();
}

export interface DiscoverTagCategoryRow {
  category: string;
  tag_value: string;
  object_count: number;
}

export interface DiscoverUserRow {
  name: string;
  posting_json_metadata: string | null;
  json_metadata: string | null;
  profile_image: string | null;
  object_reputation: number;
  followers_count: number;
  is_following: boolean;
  wobjects_weight: number | null;
}

export interface DiscoverTagFilter {
  category: string;
  value: string;
}

export interface ListDiscoverObjectsParams {
  objectType?: string;
  q?: string;
  tags: DiscoverTagFilter[];
  sort: DiscoverSort;
  cursor?: string;
  limit: number;
  viewerAccount?: string;
  box?: DiscoverBox;
}

export interface ListDiscoverObjectsResult {
  rows: DiscoverObjectCandidateRow[];
  hasMore: boolean;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function canDiscoverObjectTextSearch(qTrimmed: string): boolean {
  if (qTrimmed.length === 0) {
    return true;
  }
  const tsQueryCheck = buildAutocompleteTsQuery(qTrimmed);
  return (
    tsQueryCheck !== null ||
    shouldSearchObjectIdSubstring(qTrimmed) ||
    shouldSearchPrefix(qTrimmed)
  );
}

function buildDiscoverObjectTextMatchFilter(params: {
  qTrimmed: string;
  tsQuery: string | null;
  includeIdSubstring: boolean;
  idSubstringPattern: string | null;
}) {
  const { qTrimmed, tsQuery, includeIdSubstring, idSubstringPattern } = params;
  if (qTrimmed.length === 0) {
    return sql``;
  }

  const parts: ReturnType<typeof sql>[] = [];

  if (shouldSearchPrefix(qTrimmed)) {
    const prefixLower = qTrimmed.toLowerCase();
    const prefixUpper = prefixUpperBound(prefixLower);
    const namePrefixPattern = `${escapeIlikePattern(prefixLower)}%`;
    const jsonPrefixPattern = namePrefixPattern;
    parts.push(
      sql`(oc.object_id COLLATE "C" >= ${prefixLower} AND oc.object_id COLLATE "C" < ${prefixUpper})`,
    );
    parts.push(sql`EXISTS (
      SELECT 1 FROM object_updates ou_name
      WHERE ou_name.object_id = oc.object_id
        AND ou_name.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]})
        AND ou_name.value_text_normalized LIKE ${namePrefixPattern} ESCAPE '\\'
    )`);
    parts.push(sql`EXISTS (
      SELECT 1 FROM object_updates ou_identifier
      WHERE ou_identifier.object_id = oc.object_id
        AND ou_identifier.update_type = ${UPDATE_TYPES.IDENTIFIER}
        AND lower(ou_identifier.value_json->>'value') LIKE ${jsonPrefixPattern} ESCAPE '\\'
    )`);
    parts.push(sql`EXISTS (
      SELECT 1 FROM object_updates ou_locality
      WHERE ou_locality.object_id = oc.object_id
        AND ou_locality.update_type = ${UPDATE_TYPES.ADDRESS}
        AND lower(ou_locality.value_json->>'locality') LIKE ${jsonPrefixPattern} ESCAPE '\\'
    )`);
  }

  if (includeIdSubstring && idSubstringPattern) {
    parts.push(sql`oc.object_id ILIKE ${idSubstringPattern} ESCAPE '\\'`);
  }

  if (tsQuery != null) {
    parts.push(sql`EXISTS (
      SELECT 1 FROM object_updates ou_fts
      WHERE ou_fts.object_id = oc.object_id
        AND ou_fts.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
        AND ou_fts.search_vector @@ to_tsquery('english', ${tsQuery})
    )`);
  }

  if (parts.length === 0) {
    return sql`AND false`;
  }

  return sql`AND (${sql.join(parts, sql` OR `)})`;
}

function buildDiscoverGeoBoxFilter(box: DiscoverBox | undefined) {
  if (!box) {
    return sql``;
  }
  return sql`AND EXISTS (
    SELECT 1 FROM (
      SELECT ou_geo.value_geo
      FROM object_updates ou_geo
      WHERE ou_geo.object_id = oc.object_id
        AND ou_geo.update_type = 'geo'
        AND ou_geo.value_geo IS NOT NULL
      ORDER BY ou_geo.rank_score DESC NULLS LAST, ou_geo.created_at_unix DESC
      LIMIT 1
    ) geo
    WHERE ST_Intersects(
      geo.value_geo::geometry,
      ST_MakeEnvelope(${box.swLng}, ${box.swLat}, ${box.neLng}, ${box.neLat}, 4326)
    )
  )`;
}

function discoverSortKey(sort: DiscoverSort, alias: 'oc' | 'picked') {
  if (alias === 'oc') {
    if (sort === 'oldest') {
      return sql`oc.created_at ASC, oc.object_id ASC`;
    }
    if (sort === 'rank') {
      return sql`oc.weight DESC NULLS LAST, oc.object_id ASC`;
    }
    return sql`oc.created_at DESC, oc.object_id ASC`;
  }
  if (sort === 'oldest') {
    return sql`picked.created_at ASC, picked.object_id ASC`;
  }
  if (sort === 'rank') {
    return sql`picked.weight DESC NULLS LAST, picked.object_id ASC`;
  }
  return sql`picked.created_at DESC, picked.object_id ASC`;
}

@Injectable()
export class DiscoverRepository {
  private readonly logger = new Logger(DiscoverRepository.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly redisFactory: RedisClientFactory,
  ) {}

  async listObjects(params: ListDiscoverObjectsParams): Promise<ListDiscoverObjectsResult> {
    const limit = params.limit;
    const fetchLimit = limit + 1;
    const cursor = params.cursor ? decodeDiscoverObjectCursor(params.cursor) : null;
    const qTrimmed = params.q?.trim() ?? '';
    if (qTrimmed.length > 0 && !canDiscoverObjectTextSearch(qTrimmed)) {
      return { rows: [], hasMore: false };
    }
    const tsQuery = qTrimmed.length > 0 ? buildAutocompleteTsQuery(qTrimmed) : null;
    const includeIdSubstring =
      qTrimmed.length > 0 ? shouldSearchObjectIdSubstring(qTrimmed) : false;
    const idSubstringPattern =
      qTrimmed.length > 0 ? `%${escapeIlikePattern(qTrimmed)}%` : null;

    try {
      const tagExistsFragments = params.tags.map(
        ({ category, value }) => sql`EXISTS (
          SELECT 1 FROM object_tag_category_items tci
          WHERE tci.object_id = oc.object_id
            AND tci.category = ${category}
            AND tci.value = ${value}
            ${params.objectType ? sql`AND tci.object_type = ${params.objectType}` : sql``}
        )`,
      );

      const cursorCreatedAt =
        cursor && (params.sort === 'newest' || params.sort === 'oldest')
          ? new Date(cursor.created_at)
          : null;

      const cursorFilter =
        cursor && cursor.sort === params.sort
          ? params.sort === 'newest' && cursorCreatedAt
            ? sql`AND picked.created_at < ${cursorCreatedAt}`
            : params.sort === 'oldest' && cursorCreatedAt
              ? sql`AND picked.created_at > ${cursorCreatedAt}`
              : params.sort === 'rank'
                ? sql`AND (
                  COALESCE(picked.weight, -1::float8) < COALESCE(${cursor.weight}::float8, -1::float8)
                  OR (
                    COALESCE(picked.weight, -1::float8) = COALESCE(${cursor.weight}::float8, -1::float8)
                    AND picked.object_id > ${cursor.object_id}
                  )
                )`
                : sql``
          : sql``;

      const innerSort = discoverSortKey(params.sort, 'oc');
      const outerSort = discoverSortKey(params.sort, 'picked');

      const textMatchFilter = buildDiscoverObjectTextMatchFilter({
        qTrimmed,
        tsQuery,
        includeIdSubstring,
        idSubstringPattern,
      });

      const objectTypeFilter = params.objectType
        ? sql`AND oc.object_type = ${params.objectType}`
        : sql``;

      const tagFilter =
        tagExistsFragments.length > 0
          ? sql`AND ${sql.join(tagExistsFragments, sql` AND `)}`
          : sql``;

      const geoBoxFilter = buildDiscoverGeoBoxFilter(params.box);

      const result = await sql<DiscoverObjectCandidateRow>`
        WITH picked AS (
          SELECT DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))
            oc.object_id AS object_id,
            oc.created_at AS created_at,
            oc.weight AS weight
          FROM objects_core oc
          WHERE oc.status = 'active'
            ${objectTypeFilter}
            ${textMatchFilter}
            ${tagFilter}
            ${geoBoxFilter}
          ORDER BY COALESCE(oc.meta_group_id, oc.object_id), ${innerSort}
        )
        SELECT picked.object_id AS object_id, picked.created_at AS created_at, picked.weight AS weight
        FROM picked
        WHERE TRUE
          ${cursorFilter}
        ORDER BY ${outerSort}
        LIMIT ${fetchLimit}
      `.execute(this.db);

      const rows = result.rows.slice(0, limit);
      const hasMore = result.rows.length > limit;
      return { rows, hasMore };
    } catch (error) {
      this.logger.error(
        `listObjects failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { rows: [], hasMore: false };
    }
  }

  buildObjectCursor(row: DiscoverObjectCandidateRow, sort: DiscoverSort): string {
    return encodeDiscoverObjectCursor({
      sort,
      created_at: createdAtToIso(row.created_at),
      weight: row.weight,
      object_id: row.object_id,
    });
  }

  async getTagCategories(
    objectType: string,
    activeTags: DiscoverTagFilter[] = [],
    q?: string,
    box?: DiscoverBox,
  ): Promise<DiscoverTagCategoryRow[]> {
    const trimmed = objectType.trim();
    if (!trimmed) {
      return [];
    }

    const qTrimmed = q?.trim() ?? '';
    if (qTrimmed.length > 0 || box) {
      return this.getTagCategoriesFiltered(trimmed, activeTags, qTrimmed, box);
    }

    const useCache = activeTags.length === 0 && !box;
    const redis = this.redisFactory.getClient(0);
    const key = redisKey.discoverTagCategories(trimmed);
    if (useCache) {
      const cached = await redis.get(key);
      if (cached) {
        try {
          return JSON.parse(cached) as DiscoverTagCategoryRow[];
        } catch {
          this.logger.warn(`discover tag categories: corrupt cache for ${trimmed}`);
        }
      }
    }

    try {
      const filterTuples =
        activeTags.length > 0
          ? sql.join(
              activeTags.map(
                ({ category, value }) => sql`(${category}, ${value})`,
              ),
              sql`, `,
            )
          : null;

      const result =
        activeTags.length > 0 && filterTuples
          ? await sql<{
              category: string;
              tag_value: string;
              object_count: number | string;
            }>`
              SELECT
                tci.category AS category,
                tci.value AS tag_value,
                COUNT(DISTINCT COALESCE(oc.meta_group_id, tci.object_id))::int AS object_count
              FROM object_tag_category_items tci
              INNER JOIN objects_core oc
                ON oc.object_id = tci.object_id AND oc.status = 'active'
              WHERE tci.object_type = ${trimmed}
                AND tci.object_id IN (
                  SELECT tci2.object_id
                  FROM object_tag_category_items tci2
                  WHERE tci2.object_type = ${trimmed}
                    AND (tci2.category, tci2.value) IN (${filterTuples})
                  GROUP BY tci2.object_id
                  HAVING COUNT(*) = ${activeTags.length}
                )
              GROUP BY 1, 2
              ORDER BY 1 ASC, 3 DESC, 2 ASC
            `.execute(this.db)
          : await sql<{
              category: string;
              tag_value: string;
              object_count: number | string;
            }>`
              SELECT
                tci.category AS category,
                tci.value AS tag_value,
                COUNT(DISTINCT COALESCE(oc.meta_group_id, tci.object_id))::int AS object_count
              FROM object_tag_category_items tci
              INNER JOIN objects_core oc
                ON oc.object_id = tci.object_id AND oc.status = 'active'
              WHERE tci.object_type = ${trimmed}
              GROUP BY 1, 2
              ORDER BY 1 ASC, 3 DESC, 2 ASC
            `.execute(this.db);

      const rows: DiscoverTagCategoryRow[] = result.rows.map((r) => ({
        category: r.category,
        tag_value: r.tag_value,
        object_count:
          typeof r.object_count === 'number'
            ? r.object_count
            : Math.trunc(Number(r.object_count)),
      }));

      if (useCache) {
        await redis.set(
          key,
          JSON.stringify(rows),
          DISCOVER_TAG_CATEGORIES_CACHE_TTL_SEC,
        );
      }
      return rows;
    } catch (error) {
      this.logger.error(
        `getTagCategories failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private async getTagCategoriesFiltered(
    objectType: string,
    activeTags: DiscoverTagFilter[],
    qTrimmed: string,
    box?: DiscoverBox,
  ): Promise<DiscoverTagCategoryRow[]> {
    if (qTrimmed.length > 0 && !canDiscoverObjectTextSearch(qTrimmed)) {
      return [];
    }

    const tsQuery = qTrimmed.length > 0 ? buildAutocompleteTsQuery(qTrimmed) : null;
    const includeIdSubstring =
      qTrimmed.length > 0 ? shouldSearchObjectIdSubstring(qTrimmed) : false;
    const idSubstringPattern =
      qTrimmed.length > 0 ? `%${escapeIlikePattern(qTrimmed)}%` : null;

    const tagExistsFragments = activeTags.map(
      ({ category, value }) => sql`EXISTS (
        SELECT 1 FROM object_tag_category_items tci_tag
        WHERE tci_tag.object_id = oc.object_id
          AND tci_tag.category = ${category}
          AND tci_tag.value = ${value}
          AND tci_tag.object_type = ${objectType}
      )`,
    );

    const textFilter = buildDiscoverObjectTextMatchFilter({
      qTrimmed,
      tsQuery,
      includeIdSubstring,
      idSubstringPattern,
    });

    const tagFilter =
      tagExistsFragments.length > 0
        ? sql`AND ${sql.join(tagExistsFragments, sql` AND `)}`
        : sql``;

    const geoBoxFilter = buildDiscoverGeoBoxFilter(box);

    try {
      const result = await sql<{
        category: string;
        tag_value: string;
        object_count: number | string;
      }>`
        SELECT
          tci.category AS category,
          tci.value AS tag_value,
          COUNT(DISTINCT COALESCE(oc.meta_group_id, tci.object_id))::int AS object_count
        FROM object_tag_category_items tci
        INNER JOIN objects_core oc
          ON oc.object_id = tci.object_id AND oc.status = 'active'
        WHERE tci.object_type = ${objectType}
          AND tci.object_id IN (
            SELECT oc.object_id
            FROM objects_core oc
            WHERE oc.status = 'active'
              AND oc.object_type = ${objectType}
              ${textFilter}
              ${tagFilter}
              ${geoBoxFilter}
          )
        GROUP BY 1, 2
        ORDER BY 1 ASC, 3 DESC, 2 ASC
      `.execute(this.db);

      return result.rows.map((r) => ({
        category: r.category,
        tag_value: r.tag_value,
        object_count:
          typeof r.object_count === 'number'
            ? r.object_count
            : Math.trunc(Number(r.object_count)),
      }));
    } catch (error) {
      this.logger.error(
        `getTagCategoriesFiltered failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async listUsers(params: {
    q?: string;
    cursor?: string;
    limit: number;
    viewerAccount?: string;
  }): Promise<{ rows: DiscoverUserRow[]; hasMore: boolean }> {
    const fetchLimit = params.limit + 1;
    const qTrimmed = params.q?.trim() ?? '';
    const cursor = params.cursor ? decodeDiscoverUserCursor(params.cursor) : null;
    const viewerTrimmed = params.viewerAccount?.trim() ?? '';

    try {
      const prefixFilter =
        qTrimmed.length > 0
          ? (() => {
              const prefix = escapeIlikePattern(qTrimmed).toLowerCase();
              const upper = prefixUpperBound(prefix);
              return sql`AND ac.name >= ${prefix} AND ac.name < ${upper}`;
            })()
          : sql``;

      const cursorFilter = cursor
        ? sql`AND (
            COALESCE(ac.wobjects_weight, -1::float8) < COALESCE(${cursor.wobjects_weight}::float8, -1::float8)
            OR (
              COALESCE(ac.wobjects_weight, -1::float8) = COALESCE(${cursor.wobjects_weight}::float8, -1::float8)
              AND ac.name > ${cursor.name}
            )
          )`
        : sql``;

      const isFollowingSelect =
        viewerTrimmed.length > 0
          ? sql`EXISTS (
              SELECT 1 FROM user_subscriptions us
              WHERE us.follower = ${viewerTrimmed}
                AND us.following = ac.name
            )`
          : sql`false`;

      const result = await sql<DiscoverUserRow>`
        SELECT
          ac.name AS name,
          ac.posting_json_metadata AS posting_json_metadata,
          ac.json_metadata AS json_metadata,
          ac.profile_image AS profile_image,
          ac.object_reputation AS object_reputation,
          ac.followers_count AS followers_count,
          ac.wobjects_weight AS wobjects_weight,
          ${isFollowingSelect} AS is_following
        FROM accounts_current ac
        WHERE 1 = 1
          ${prefixFilter}
          ${cursorFilter}
        ORDER BY ac.wobjects_weight DESC NULLS LAST, ac.name ASC
        LIMIT ${fetchLimit}
      `.execute(this.db);

      const mapped = result.rows.map((r) => ({
        name: r.name,
        posting_json_metadata: r.posting_json_metadata,
        json_metadata: r.json_metadata,
        profile_image: r.profile_image,
        object_reputation: r.object_reputation,
        followers_count: r.followers_count,
        is_following: Boolean(r.is_following),
        wobjects_weight: r.wobjects_weight,
      }));

      return {
        rows: mapped.slice(0, params.limit),
        hasMore: mapped.length > params.limit,
      };
    } catch (error) {
      this.logger.error(
        `listUsers failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { rows: [], hasMore: false };
    }
  }

  buildUserCursor(row: DiscoverUserRow): string {
    return encodeDiscoverUserCursor({
      name: row.name,
      wobjects_weight: row.wobjects_weight,
      followers_count: row.followers_count,
    });
  }
}
