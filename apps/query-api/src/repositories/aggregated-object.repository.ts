import { Injectable, Inject, Logger } from '@nestjs/common';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type {
  ObjectsCore,
  ObjectUpdate,
  ValidityVote,
  ObjectAuthority,
} from '@opden-data-layer/core';
import type {
  AggregatedObject,
  VoterWaivPowerMap,
} from '@opden-data-layer/objects-domain';
import {
  LIST_TREE_MAX_DEPTH,
  LIST_TREE_WARN_NODE_COUNT,
} from '../constants/cache.constants';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { RankVoteProjection } from '../domain/object-projection/projected-object.types';
import { emptyRankVoteProjection } from '../domain/object-projection/projected-object.types';

/** Options for {@link AggregatedObjectRepository.loadByObjectIds}. */
export interface LoadAggregatedObjectsOptions {
  viewerAccount?: string | null;
  /**
   * When false, skips `rank_votes` COUNT and viewer-rank lookups (still loads AVG for rank_score fallback).
   * Use when resolving ref summaries without `aggregateRating`.
   */
  includeRankVoteProjection?: boolean;
}

/**
 * Loads all data required to assemble ResolvedObjectView for a batch of objects.
 *
 * Pipeline:
 *   1. objects_core
 *   2. object_updates (includes persisted rank_score / rank_context)
 *   3. validity_votes
 *   4. object_authority
 *   5. user_object_powers — distinct validity voters from step 3
 *   6. rank_votes — optional aggregates for projection (counts, viewer ranks, AVG fallback)
 *
 * For `aggregateRating` rows with a null persisted `rank_score` (e.g. legacy migrate
 * only filled `rank_votes`), a read-time **mean rank per `update_id`** from `rank_votes`
 * is merged into the in-memory `ObjectUpdate` so resolution/projection match indexer behaviour.
 *
 * @see docs/spec/data-model/flow.md §Step 3
 */
@Injectable()
export class AggregatedObjectRepository {
  private readonly logger = new Logger(AggregatedObjectRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Collects all object IDs reachable from each root via `listItem` updates (superset for batch load).
   * `object_updates` has no persisted validity — filtering is done in the service via {@link loadByObjectIds}
   * and governance resolution.
   */
  async loadListTreeIdsByRoots(rootIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (rootIds.length === 0) {
      return out;
    }

    try {
      const started = Date.now();
      const valueRows = rootIds.map((id) => sql`(${id})`);
      const rows = await sql<{ root_id: string; object_id: string }>`
        WITH RECURSIVE list_tree(root_id, object_id, depth, path) AS (
          SELECT v.id, v.id, 0, ARRAY[v.id]::text[]
          FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(id)

          UNION ALL

          SELECT lt.root_id, child.child_id, lt.depth + 1, lt.path || child.child_id
          FROM list_tree lt
          CROSS JOIN LATERAL (
            SELECT DISTINCT TRIM(ou.value_text) AS child_id
            FROM object_updates ou
            WHERE ou.object_id = lt.object_id
              AND ou.update_type = ${UPDATE_TYPES.LIST_ITEM}
              AND ou.value_text IS NOT NULL
              AND TRIM(ou.value_text) <> ''
          ) child
          WHERE lt.depth < ${LIST_TREE_MAX_DEPTH}
            AND NOT (child.child_id = ANY(lt.path))
        )
        SELECT DISTINCT root_id, object_id
        FROM list_tree
      `.execute(this.db);

      const elapsedMs = Date.now() - started;
      if (rows.rows.length > LIST_TREE_WARN_NODE_COUNT || elapsedMs > 500) {
        const byRoot = new Map<string, number>();
        for (const row of rows.rows) {
          byRoot.set(row.root_id, (byRoot.get(row.root_id) ?? 0) + 1);
        }
        const largest = [...byRoot.entries()].sort((a, b) => b[1] - a[1])[0];
        this.logger.warn(
          `loadListTreeIdsByRoots roots=${rootIds.length} nodes=${rows.rows.length} ${elapsedMs}ms` +
            (largest ? ` largest=${largest[0]}(${largest[1]} nodes)` : ''),
        );
      }

      for (const rootId of rootIds) {
        out.set(rootId, []);
      }
      for (const row of rows.rows) {
        const ids = out.get(row.root_id);
        if (ids) {
          ids.push(row.object_id);
        }
      }
      return out;
    } catch (error) {
      this.logger.error(
        `Failed to load list tree ids: ${error instanceof Error ? error.message : String(error)}`,
      );
      const fallback = new Map<string, string[]>();
      for (const rootId of rootIds) {
        fallback.set(rootId, []);
      }
      return fallback;
    }
  }

  /**
   * Minimal load for recursive list-item counting. Compared to {@link loadByObjectIds}:
   *   - `object_updates`: only `listItem` rows (not all update types)
   *   - `validity_votes` and `object_authority`: only for `list`-type objects (leaves need none)
   *   - `user_object_powers`: only for voters on those list objects
   *   - `rank_votes`: skipped entirely (not needed for counting)
   */
  async loadForListCount(objectIds: string[]): Promise<{
    objects: AggregatedObject[];
    voterWaivPowers: VoterWaivPowerMap;
  }> {
    if (objectIds.length === 0) {
      return { objects: [], voterWaivPowers: new Map() };
    }

    try {
      const started = Date.now();
      const [cores, listItemUpdates] = await Promise.all([
        this.db
          .selectFrom('objects_core')
          .where('object_id', 'in', objectIds)
          .where('status', '=', 'active')
          .selectAll()
          .execute(),
        this.db
          .selectFrom('object_updates')
          .where('object_id', 'in', objectIds)
          .where('update_type', '=', UPDATE_TYPES.LIST_ITEM)
          .selectAll()
          .execute(),
      ]);

      const listObjectIds = cores
        .filter((c) => c.object_type === 'list')
        .map((c) => c.object_id);

      let validityVotes: ValidityVote[] = [];
      let authorities: ObjectAuthority[] = [];
      if (listObjectIds.length > 0) {
        [validityVotes, authorities] = await Promise.all([
          this.db
            .selectFrom('validity_votes')
            .where('object_id', 'in', listObjectIds)
            .selectAll()
            .execute(),
          this.db
            .selectFrom('object_authority')
            .where('object_id', 'in', listObjectIds)
            .selectAll()
            .execute(),
        ]);
      }

      const voterNames = collectDistinctVoters(validityVotes);
      const voterWaivPowers: VoterWaivPowerMap = new Map();
      if (voterNames.size > 0) {
        const rows = await this.db
          .selectFrom('user_object_powers')
          .where('account', 'in', [...voterNames])
          .select(['account', 'waiv_power'])
          .execute();
        for (const row of rows) {
          voterWaivPowers.set(row.account, row.waiv_power);
        }
      }

      const objects = groupByObjectId(cores, listItemUpdates, validityVotes, authorities);
      const elapsedMs = Date.now() - started;
      if (objectIds.length > LIST_TREE_WARN_NODE_COUNT || elapsedMs > 500) {
        this.logger.warn(
          `loadForListCount ids=${objectIds.length} listObjects=${listObjectIds.length} listItemRows=${listItemUpdates.length} ${elapsedMs}ms`,
        );
      }
      return { objects, voterWaivPowers };
    } catch (error) {
      this.logger.error(
        `Failed to load objects for list count: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { objects: [], voterWaivPowers: new Map() };
    }
  }

  async loadByObjectIds(
    objectIds: string[],
    options?: LoadAggregatedObjectsOptions,
  ): Promise<{
    objects: AggregatedObject[];
    voterWaivPowers: VoterWaivPowerMap;
    rankVoteProjection: RankVoteProjection;
  }> {
    if (objectIds.length === 0) {
      return { objects: [], voterWaivPowers: new Map(), rankVoteProjection: emptyRankVoteProjection() };
    }

    try {
      const [cores, updates, validityVotes, authorities] = await Promise.all([
        this.db
          .selectFrom('objects_core')
          .where('object_id', 'in', objectIds)
          .where('status', '=', 'active')
          .selectAll()
          .execute(),
        this.db
          .selectFrom('object_updates')
          .where('object_id', 'in', objectIds)
          .selectAll()
          .execute(),
        this.db
          .selectFrom('validity_votes')
          .where('object_id', 'in', objectIds)
          .selectAll()
          .execute(),
        this.db
          .selectFrom('object_authority')
          .where('object_id', 'in', objectIds)
          .selectAll()
          .execute(),
      ]);

      const rankMeans = await this.db
        .selectFrom('rank_votes')
        .where('object_id', 'in', objectIds)
        .select(({ fn }) => ['update_id', fn.avg<number | null>('rank').as('avg_rank')])
        .groupBy('update_id')
        .execute();

      const meanRankByUpdateId = new Map<string, number>();
      for (const row of rankMeans) {
        const raw = row.avg_rank;
        if (raw == null) {
          continue;
        }
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(n)) {
          meanRankByUpdateId.set(row.update_id, Math.round(n));
        }
      }

      const includeVp = options?.includeRankVoteProjection !== false;

      let rankVoteProjection: RankVoteProjection = emptyRankVoteProjection();
      if (includeVp) {
        const viewer = options?.viewerAccount?.trim();
        const [voteCounts, viewerRows] = await Promise.all([
          this.db
            .selectFrom('rank_votes')
            .where('object_id', 'in', objectIds)
            .select((eb) => ['update_id', eb.fn.countAll<number>().as('n')])
            .groupBy('update_id')
            .execute(),
          viewer
            ? this.db
                .selectFrom('rank_votes')
                .where('object_id', 'in', objectIds)
                .where('voter', '=', viewer)
                .select(['update_id', 'rank', 'event_seq'])
                .execute()
            : Promise.resolve([]),
        ]);
        rankVoteProjection = buildRankVoteProjection(voteCounts, viewerRows);
      }

      const updatesWithRankFallback = applyAggregateRatingRankScoreFallback(
        updates,
        meanRankByUpdateId,
      );

      const voterNames = collectDistinctVoters(validityVotes);
      const voterWaivPowers: VoterWaivPowerMap = new Map();

      if (voterNames.size > 0) {
        const rows = await this.db
          .selectFrom('user_object_powers')
          .where('account', 'in', [...voterNames])
          .select(['account', 'waiv_power'])
          .execute();
        for (const row of rows) {
          voterWaivPowers.set(row.account, row.waiv_power);
        }
      }

      const objects = groupByObjectId(cores, updatesWithRankFallback, validityVotes, authorities);
      return { objects, voterWaivPowers, rankVoteProjection };
    } catch (error) {
      this.logger.error(
        `Failed to load aggregated objects: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { objects: [], voterWaivPowers: new Map(), rankVoteProjection: emptyRankVoteProjection() };
    }
  }
}

function buildRankVoteProjection(
  voteCountRows: Array<{ update_id: string; n: number | bigint | string }>,
  viewerVoteRows: Array<{ update_id: string; rank: number; event_seq: bigint }>,
): RankVoteProjection {
  const countByUpdateId = new Map<string, number>();
  for (const row of voteCountRows) {
    const raw = typeof row.n === 'bigint' ? Number(row.n) : Number(row.n);
    if (Number.isFinite(raw)) {
      countByUpdateId.set(row.update_id, Math.trunc(raw));
    }
  }
  const latestByUpdate = new Map<string, { rank: number; seq: bigint }>();
  for (const row of viewerVoteRows) {
    const prev = latestByUpdate.get(row.update_id);
    if (!prev || row.event_seq > prev.seq) {
      latestByUpdate.set(row.update_id, { rank: row.rank, seq: row.event_seq });
    }
  }
  const viewerRankByUpdateId = new Map<string, number>();
  for (const [id, v] of latestByUpdate) {
    viewerRankByUpdateId.set(id, v.rank);
  }
  return { countByUpdateId, viewerRankByUpdateId };
}

/** Prefer persisted `object_updates.rank_score`; else mean(`rank_votes.rank`) for that `update_id`. Exported for unit tests. */
export function applyAggregateRatingRankScoreFallback(
  updates: ObjectUpdate[],
  meanRankByUpdateId: ReadonlyMap<string, number>,
): ObjectUpdate[] {
  return updates.map((u) => {
    if (u.update_type !== UPDATE_TYPES.AGGREGATE_RATING) {
      return u;
    }
    if (u.rank_score != null) {
      return u;
    }
    const fb = meanRankByUpdateId.get(u.update_id);
    if (fb === undefined) {
      return u;
    }
    return { ...u, rank_score: fb };
  });
}

function collectDistinctVoters(validityVotes: ValidityVote[]): Set<string> {
  const names = new Set<string>();
  for (const v of validityVotes) names.add(v.voter);
  return names;
}

function groupByObjectId(
  cores: ObjectsCore[],
  updates: ObjectUpdate[],
  validityVotes: ValidityVote[],
  authorities: ObjectAuthority[],
): AggregatedObject[] {
  return cores.map((core) => ({
    core,
    updates: updates.filter((u) => u.object_id === core.object_id),
    validity_votes: validityVotes.filter((v) => v.object_id === core.object_id),
    authorities: authorities.filter((a) => a.object_id === core.object_id),
  }));
}
