import { Injectable, Inject, Logger } from '@nestjs/common';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { Kysely } from 'kysely';
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
