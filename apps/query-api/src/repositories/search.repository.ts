import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { Database } from '../database';
import { KYSELY } from '../database';
import { buildAutocompleteTsQuery } from './search-fts.utils';
import { prefixUpperBound, shouldSearchObjectIdSubstring } from './search-prefix.utils';

export interface SearchObjectCandidateRow {
  object_id: string;
  object_type: string;
  meta_group_id: string | null;
  weight: number | null;
}

export interface SearchUserRow {
  name: string;
  profile_image: string | null;
  object_reputation: number;
  followers_count: number;
  is_following: boolean;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Text update kinds indexed for FTS (`search_vector`); see `object_updates` trigger in schema. */
const FTS_TEXT_UPDATE_TYPES = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.TITLE,
  UPDATE_TYPES.DESCRIPTION,
] as const;

/** Sort tier: FTS hit (default). */
const SEARCH_TIER_FTS = 0;
/** Sort tier: exact `value_text_normalized` match (multi-word queries only). */
const SEARCH_TIER_EXACT_TEXT = 1;
/** Sort tier: `object_id` substring (id-shaped queries). */
const SEARCH_TIER_ID_SUBSTRING = 2;

@Injectable()
export class SearchRepository {
  private readonly logger = new Logger(SearchRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Object hits: FTS on `name` / `title` / `description`, optional id substring and
   * exact name boost (multi-word only). No `ts_rank` over the full hit set — keeps GIN path fast.
   */
  async searchObjects(queryText: string, limit: number): Promise<SearchObjectCandidateRow[]> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return [];
    }

    const tsQuery = buildAutocompleteTsQuery(trimmed);
    if (tsQuery === null) {
      return [];
    }

    const normalized = trimmed.toLowerCase();
    const isMultiWord = /\s/.test(trimmed);
    const includeIdSubstring = shouldSearchObjectIdSubstring(trimmed);
    const idSubstringPattern = `%${escapeIlikePattern(trimmed)}%`;
    const useFastFtsPath = !isMultiWord && !includeIdSubstring;

    try {
      const result = useFastFtsPath
        ? await sql<SearchObjectCandidateRow>`
            WITH fts_ids AS (
              SELECT DISTINCT ou.object_id
              FROM object_updates ou
              WHERE ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.search_vector @@ to_tsquery('english', ${tsQuery})
            )
            SELECT DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))
              oc.object_id AS object_id,
              oc.object_type AS object_type,
              oc.meta_group_id AS meta_group_id,
              oc.weight AS weight
            FROM objects_core oc
            INNER JOIN fts_ids c ON c.object_id = oc.object_id
            WHERE oc.status = 'active'
            ORDER BY COALESCE(oc.meta_group_id, oc.object_id), oc.weight DESC NULLS LAST
            LIMIT ${limit}
          `.execute(this.db)
        : await sql<SearchObjectCandidateRow>`
            WITH fts_ids AS (
              SELECT DISTINCT ou.object_id
              FROM object_updates ou
              WHERE ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.search_vector @@ to_tsquery('english', ${tsQuery})
            ),
            exact_ids AS (
              SELECT DISTINCT ou.object_id
              FROM object_updates ou
              WHERE ${isMultiWord}
                AND ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.value_text_normalized = ${normalized}
            ),
            id_hits AS (
              SELECT object_id
              FROM objects_core
              WHERE status = 'active'
                AND ${includeIdSubstring}
                AND object_id ILIKE ${idSubstringPattern} ESCAPE '\\'
            ),
            candidates AS (
              SELECT object_id, ${SEARCH_TIER_ID_SUBSTRING}::int AS sort_tier FROM id_hits
              UNION ALL
              SELECT object_id, ${SEARCH_TIER_EXACT_TEXT}::int FROM exact_ids
              UNION ALL
              SELECT object_id, ${SEARCH_TIER_FTS}::int FROM fts_ids
            ),
            best AS (
              SELECT object_id, MAX(sort_tier) AS sort_tier
              FROM candidates
              GROUP BY object_id
            ),
            collapsed AS (
              SELECT DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))
                oc.object_id AS object_id,
                oc.object_type AS object_type,
                oc.meta_group_id AS meta_group_id,
                oc.weight AS weight,
                b.sort_tier AS sort_tier
              FROM objects_core oc
              INNER JOIN best b ON b.object_id = oc.object_id
              WHERE oc.status = 'active'
              ORDER BY COALESCE(oc.meta_group_id, oc.object_id), b.sort_tier DESC, oc.weight DESC NULLS LAST
            )
            SELECT object_id, object_type, meta_group_id, weight
            FROM collapsed
            ORDER BY sort_tier DESC, weight DESC NULLS LAST
            LIMIT ${limit}
          `.execute(this.db);

      return (result.rows as SearchObjectCandidateRow[]) ?? [];
    } catch (error) {
      this.logger.error(
        `searchObjects failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Prefix match on `accounts_current.name` (btree range on PK), ordered by Waiv object weight then followers.
   */
  async searchUsers(queryText: string, limit: number, viewer?: string | null): Promise<SearchUserRow[]> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return [];
    }

    const prefix = escapeIlikePattern(trimmed).toLowerCase();
    const upper = prefixUpperBound(prefix);
    const viewerTrimmed = viewer?.trim() || '';

    try {
      const rows = await this.db
        .selectFrom('accounts_current')
        .select([
          'name',
          'profile_image',
          'object_reputation',
          'followers_count',
          viewerTrimmed.length === 0
            ? sql<boolean>`false`.as('is_following')
            : sql<boolean>`EXISTS (
              SELECT 1 FROM user_subscriptions us
              WHERE us.follower = ${viewerTrimmed}
                AND us.following = accounts_current.name
            )`.as('is_following'),
        ])
        .where('name', '>=', prefix)
        .where('name', '<', upper)
        .orderBy(sql`wobjects_weight desc nulls last`)
        .orderBy('followers_count', 'desc')
        .limit(limit)
        .execute();

      return rows.map((r) => ({
        name: r.name,
        profile_image: r.profile_image,
        object_reputation: r.object_reputation,
        followers_count: r.followers_count,
        is_following: Boolean(r.is_following),
      }));
    } catch (error) {
      this.logger.error(
        `searchUsers failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Global object counts per `object_type` for query `q` (deduped by `meta_group_id`, active only).
   */
  async countObjectsByType(queryText: string): Promise<Record<string, number>> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return {};
    }

    const tsQuery = buildAutocompleteTsQuery(trimmed);
    if (tsQuery === null) {
      return {};
    }

    const includeIdSubstring = shouldSearchObjectIdSubstring(trimmed);
    const idSubstringPattern = `%${escapeIlikePattern(trimmed)}%`;

    try {
      const result = includeIdSubstring
        ? await sql<{ object_type: string; cnt: number | string }>`
            WITH fts_ids AS (
              SELECT DISTINCT ou.object_id
              FROM object_updates ou
              WHERE ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.search_vector @@ to_tsquery('english', ${tsQuery})
            ),
            id_hits AS (
              SELECT object_id
              FROM objects_core
              WHERE status = 'active'
                AND object_id ILIKE ${idSubstringPattern} ESCAPE '\\'
            ),
            candidate_ids AS (
              SELECT object_id FROM fts_ids
              UNION
              SELECT object_id FROM id_hits
            )
            SELECT oc.object_type AS object_type,
              COUNT(DISTINCT COALESCE(oc.meta_group_id, oc.object_id))::int AS cnt
            FROM objects_core oc
            INNER JOIN candidate_ids c ON c.object_id = oc.object_id
            WHERE oc.status = 'active'
            GROUP BY oc.object_type
          `.execute(this.db)
        : await sql<{ object_type: string; cnt: number | string }>`
            WITH fts_ids AS (
              SELECT DISTINCT ou.object_id
              FROM object_updates ou
              WHERE ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.search_vector @@ to_tsquery('english', ${tsQuery})
            )
            SELECT oc.object_type AS object_type,
              COUNT(DISTINCT COALESCE(oc.meta_group_id, oc.object_id))::int AS cnt
            FROM objects_core oc
            INNER JOIN fts_ids c ON c.object_id = oc.object_id
            WHERE oc.status = 'active'
            GROUP BY oc.object_type
          `.execute(this.db);

      const out: Record<string, number> = {};
      for (const row of result.rows) {
        const raw = row.cnt;
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(n)) {
          out[row.object_type] = Math.trunc(n);
        }
      }
      return out;
    } catch (error) {
      this.logger.error(
        `countObjectsByType failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  /** Total users matching the name prefix for `q` (no row cap). */
  async countUsers(queryText: string): Promise<number> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return 0;
    }

    const prefix = escapeIlikePattern(trimmed).toLowerCase();
    const upper = prefixUpperBound(prefix);

    try {
      const row = await this.db
        .selectFrom('accounts_current')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .where('name', '>=', prefix)
        .where('name', '<', upper)
        .executeTakeFirst();

      const raw = row?.n;
      const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    } catch (error) {
      this.logger.error(
        `countUsers failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }
}
