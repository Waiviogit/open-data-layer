import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { Database } from '../database';
import { KYSELY } from '../database';

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

@Injectable()
export class SearchRepository {
  private readonly logger = new Logger(SearchRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Object hits: (1) FTS on `name` / `title` / `description` updates (`search_vector`),
   * or (2) substring match on `objects_core.object_id`.
   * Active objects only, one row per `meta_group_id` (or per `object_id`) — highest `weight` wins.
   */
  async searchObjects(queryText: string, limit: number): Promise<SearchObjectCandidateRow[]> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return [];
    }

    const idSubstringPattern = `%${escapeIlikePattern(trimmed)}%`;

    try {
      const result = await sql<SearchObjectCandidateRow>`
        SELECT DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))
          oc.object_id AS object_id,
          oc.object_type AS object_type,
          oc.meta_group_id AS meta_group_id,
          oc.weight AS weight
        FROM objects_core oc
        WHERE oc.status = 'active'
          AND (
            EXISTS (
              SELECT 1
              FROM object_updates ou
              WHERE ou.object_id = oc.object_id
                AND ou.update_type IN (${FTS_TEXT_UPDATE_TYPES[0]}, ${FTS_TEXT_UPDATE_TYPES[1]}, ${FTS_TEXT_UPDATE_TYPES[2]})
                AND ou.search_vector @@ plainto_tsquery('english', ${trimmed})
            )
            OR oc.object_id ILIKE ${idSubstringPattern} ESCAPE '\\'
          )
        ORDER BY COALESCE(oc.meta_group_id, oc.object_id), oc.weight DESC NULLS LAST
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
   * Prefix match on `accounts_current.name`, ordered by Waiv object weight then followers.
   */
  async searchUsers(queryText: string, limit: number, viewer?: string | null): Promise<SearchUserRow[]> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return [];
    }

    const pattern = `${escapeIlikePattern(trimmed)}%`;
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
        .where(sql<boolean>`accounts_current.name ILIKE ${pattern} ESCAPE '\\'`)
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
}
