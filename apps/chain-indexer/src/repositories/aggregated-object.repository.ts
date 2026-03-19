import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectsCore,
  ObjectUpdate,
  ValidityVote,
  RankVote,
  ObjectAuthority,
} from '@opden-data-layer/core';
import type {
  AggregatedObject,
  VoterReputationMap,
} from '@opden-data-layer/objects-domain';

/**
 * Loads all data required to assemble ResolvedObjectView for a batch of objects.
 *
 * Executes the 6-query pipeline described in flow.md §Step 3:
 *   1. objects_core
 *   2. object_updates
 *   3. validity_votes
 *   4. rank_votes
 *   5. object_authority
 *   6. accounts_current (voter reputations — distinct voter names from queries 3+4)
 *
 * Queries 1–5 run in parallel. Query 6 runs after collecting distinct voter names.
 *
 * @see spec/postgres-concept/flow.md §Step 3
 */
@Injectable()
export class AggregatedObjectRepository {
  private readonly logger = new Logger(AggregatedObjectRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async loadByObjectIds(objectIds: string[]): Promise<{
    objects: AggregatedObject[];
    voterReputations: VoterReputationMap;
  }> {
    if (objectIds.length === 0) {
      return { objects: [], voterReputations: new Map() };
    }

    try {
      const [cores, updates, validityVotes, rankVotes, authorities] = await Promise.all([
        this.db
          .selectFrom('objects_core')
          .where('object_id', 'in', objectIds)
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
          .selectFrom('rank_votes')
          .where('object_id', 'in', objectIds)
          .selectAll()
          .execute(),
        this.db
          .selectFrom('object_authority')
          .where('object_id', 'in', objectIds)
          .selectAll()
          .execute(),
      ]);

      const voterNames = collectDistinctVoters(validityVotes, rankVotes);
      const voterReputations: VoterReputationMap = new Map();

      if (voterNames.size > 0) {
        const accounts = await this.db
          .selectFrom('accounts_current')
          .where('name', 'in', [...voterNames])
          .select(['name', 'object_reputation'])
          .execute();
        for (const account of accounts) {
          voterReputations.set(account.name, account.object_reputation);
        }
      }

      const objects = groupByObjectId(cores, updates, validityVotes, rankVotes, authorities);
      return { objects, voterReputations };
    } catch (error) {
      this.logger.error(
        `Failed to load aggregated objects: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { objects: [], voterReputations: new Map() };
    }
  }
}

function collectDistinctVoters(
  validityVotes: ValidityVote[],
  rankVotes: RankVote[],
): Set<string> {
  const names = new Set<string>();
  for (const v of validityVotes) names.add(v.voter);
  for (const v of rankVotes) names.add(v.voter);
  return names;
}

function groupByObjectId(
  cores: ObjectsCore[],
  updates: ObjectUpdate[],
  validityVotes: ValidityVote[],
  rankVotes: RankVote[],
  authorities: ObjectAuthority[],
): AggregatedObject[] {
  return cores.map((core) => ({
    core,
    updates: updates.filter((u) => u.object_id === core.object_id),
    validity_votes: validityVotes.filter((v) => v.object_id === core.object_id),
    rank_votes: rankVotes.filter((v) => v.object_id === core.object_id),
    authorities: authorities.filter((a) => a.object_id === core.object_id),
  }));
}
