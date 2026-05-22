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
import type { DiscoverSort } from '../domain/discover/discover-query.schema';
import { buildAutocompleteTsQuery } from './search-fts.utils';
import { prefixUpperBound, shouldSearchObjectIdSubstring } from './search-prefix.utils';

const FTS_TEXT_UPDATE_TYPES = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.DESCRIPTION,
] as const;

export interface DiscoverObjectCandidateRow {
  object_id: string;
  seq: number;
  weight: number | null;
}

export interface DiscoverTagCategoryRow {
  category: string;
  tag_value: string;
  object_count: number;
}

export interface DiscoverUserRow {
  name: string;
  profile_image: string | null;
  object_reputation: number;
  followers_count: number;
  is_following: boolean;
  wobjects_weight: number | null;
}

export interface ListDiscoverObjectsParams {
  objectType?: string;
  q?: string;
  tags: string[];
  sort: DiscoverSort;
  cursor?: string;
  limit: number;
  viewerAccount?: string;
}

export interface ListDiscoverObjectsResult {
  rows: DiscoverObjectCandidateRow[];
  hasMore: boolean;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
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
    if (qTrimmed.length > 0) {
      const tsQueryCheck = buildAutocompleteTsQuery(qTrimmed);
      if (tsQueryCheck === null && !shouldSearchObjectIdSubstring(qTrimmed)) {
        return { rows: [], hasMore: false };
      }
    }
    const tsQuery = qTrimmed.length > 0 ? buildAutocompleteTsQuery(qTrimmed) : null;
    const includeIdSubstring =
      qTrimmed.length > 0 ? shouldSearchObjectIdSubstring(qTrimmed) : false;
    const idSubstringPattern =
      qTrimmed.length > 0 ? `%${escapeIlikePattern(qTrimmed)}%` : null;

    try {
      const tagExistsFragments = params.tags.map(
        (tag) => sql`EXISTS (
          SELECT 1 FROM object_updates ou_tag
          WHERE ou_tag.object_id = oc.object_id
            AND ou_tag.update_type = ${UPDATE_TYPES.TAG_CATEGORY_ITEM}
            AND ou_tag.value_json->>'value' = ${tag}
        )`,
      );

      const cursorFilter =
        cursor && cursor.sort === params.sort
          ? params.sort === 'newest'
            ? sql`AND oc.seq < ${cursor.seq}`
            : params.sort === 'oldest'
              ? sql`AND oc.seq > ${cursor.seq}`
              : sql`AND (
                  COALESCE(oc.weight, -1) < COALESCE(${cursor.weight}, -1)
                  OR (
                    COALESCE(oc.weight, -1) = COALESCE(${cursor.weight}, -1)
                    AND oc.object_id < ${cursor.object_id}
                  )
                )`
          : sql``;

      const orderClause =
        params.sort === 'oldest'
          ? sql`ORDER BY oc.seq ASC, oc.object_id ASC`
          : params.sort === 'rank'
            ? sql`ORDER BY oc.weight DESC NULLS LAST, oc.object_id ASC`
            : sql`ORDER BY oc.seq DESC, oc.object_id ASC`;

      const ftsFilter =
        tsQuery != null
          ? sql`AND EXISTS (
              SELECT 1 FROM object_updates ou_fts
              WHERE ou_fts.object_id = oc.object_id
                AND ou_fts.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou_fts.search_vector @@ to_tsquery('english', ${tsQuery})
            )`
          : sql``;

      const idFilter =
        includeIdSubstring && idSubstringPattern
          ? sql`AND (
              oc.object_id ILIKE ${idSubstringPattern} ESCAPE '\\'
              OR EXISTS (
                SELECT 1 FROM object_updates ou_fts
                WHERE ou_fts.object_id = oc.object_id
                  AND ou_fts.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                  AND ou_fts.search_vector @@ to_tsquery('english', ${tsQuery})
              )
            )`
          : ftsFilter;

      const objectTypeFilter = params.objectType
        ? sql`AND oc.object_type = ${params.objectType}`
        : sql``;

      const tagFilter =
        tagExistsFragments.length > 0
          ? sql`AND ${sql.join(tagExistsFragments, sql` AND `)}`
          : sql``;

      const result = await sql<DiscoverObjectCandidateRow>`
        SELECT oc.object_id AS object_id, oc.seq AS seq, oc.weight AS weight
        FROM objects_core oc
        WHERE oc.status = 'active'
          ${objectTypeFilter}
          ${idFilter}
          ${tagFilter}
          ${cursorFilter}
        ${orderClause}
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
      seq: row.seq,
      weight: row.weight,
      object_id: row.object_id,
    });
  }

  async getTagCategories(objectType: string): Promise<DiscoverTagCategoryRow[]> {
    const trimmed = objectType.trim();
    if (!trimmed) {
      return [];
    }

    const redis = this.redisFactory.getClient(0);
    const key = redisKey.discoverTagCategories(trimmed);
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as DiscoverTagCategoryRow[];
      } catch {
        this.logger.warn(`discover tag categories: corrupt cache for ${trimmed}`);
      }
    }

    try {
      const result = await sql<{
        category: string;
        tag_value: string;
        object_count: number | string;
      }>`
        SELECT
          ou.value_json->>'category' AS category,
          ou.value_json->>'value' AS tag_value,
          COUNT(DISTINCT ou.object_id)::int AS object_count
        FROM object_updates ou
        INNER JOIN objects_core oc ON oc.object_id = ou.object_id
        WHERE ou.update_type = ${UPDATE_TYPES.TAG_CATEGORY_ITEM}
          AND oc.object_type = ${trimmed}
          AND oc.status = 'active'
          AND ou.value_json->>'category' IS NOT NULL
          AND ou.value_json->>'value' IS NOT NULL
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

      await redis.set(
        key,
        JSON.stringify(rows),
        DISCOVER_TAG_CATEGORIES_CACHE_TTL_SEC,
      );
      return rows;
    } catch (error) {
      this.logger.error(
        `getTagCategories failed: ${error instanceof Error ? error.message : String(error)}`,
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
            COALESCE(ac.wobjects_weight, -1) < COALESCE(${cursor.wobjects_weight}, -1)
            OR (
              COALESCE(ac.wobjects_weight, -1) = COALESCE(${cursor.wobjects_weight}, -1)
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
