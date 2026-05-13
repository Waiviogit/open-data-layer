import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
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

/**
 * Loads all data required to assemble ResolvedObjectView for a batch of objects.
 *
 * Pipeline:
 *   1. objects_core
 *   2. object_updates (includes persisted rank_score / rank_context)
 *   3. validity_votes
 *   4. object_authority
 *   5. user_object_powers — distinct validity voters from step 3
 *
 * @see docs/spec/data-model/flow.md §Step 3
 */
@Injectable()
export class AggregatedObjectRepository {
  private readonly logger = new Logger(AggregatedObjectRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async loadByObjectIds(objectIds: string[]): Promise<{
    objects: AggregatedObject[];
    voterWaivPowers: VoterWaivPowerMap;
  }> {
    if (objectIds.length === 0) {
      return { objects: [], voterWaivPowers: new Map() };
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

      const objects = groupByObjectId(cores, updates, validityVotes, authorities);
      return { objects, voterWaivPowers };
    } catch (error) {
      this.logger.error(
        `Failed to load aggregated objects: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { objects: [], voterWaivPowers: new Map() };
    }
  }
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
