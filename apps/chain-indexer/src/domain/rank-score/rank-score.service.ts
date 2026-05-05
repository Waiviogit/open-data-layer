import { Injectable, Logger } from '@nestjs/common';
import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import { computeUpdateRankPersistence } from '@opden-data-layer/objects-domain';
import { GovernanceCacheService } from '../governance/governance-cache.service';
import { UserObjectPowersEnsureService } from '../user-object-powers/user-object-powers-ensure.service';
import {
  ObjectUpdatesRepository,
  RankVotesRepository,
  UserObjectPowersRepository,
} from '../../repositories';

@Injectable()
export class RankScoreService {
  private readonly logger = new Logger(RankScoreService.name);

  constructor(
    private readonly rankVotesRepository: RankVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly userObjectPowersRepository: UserObjectPowersRepository,
    private readonly userObjectPowersEnsureService: UserObjectPowersEnsureService,
    private readonly governanceCache: GovernanceCacheService,
  ) {}

  async recalculateForUpdateId(updateId: string): Promise<void> {
    const trimmed = updateId.trim();
    if (trimmed.length === 0) {
      return;
    }

    const update = await this.objectUpdatesRepository.findByUpdateId(trimmed);
    if (!update) {
      return;
    }

    const definition = UPDATE_REGISTRY[update.update_type];
    if (!definition || definition.cardinality !== 'multi') {
      return;
    }

    try {
      const rankVotes = await this.rankVotesRepository.listByUpdateId(trimmed);
      const governance = await this.governanceCache.resolvePlatform();

      const voters = [...new Set(rankVotes.map((v) => v.voter))];
      for (const account of voters) {
        await this.userObjectPowersEnsureService.ensure(account);
      }

      const powerMap = await this.userObjectPowersRepository.findWaivPowersByAccounts(voters);

      const { rank_score, rank_context, rank_decisive_event_seq } =
        computeUpdateRankPersistence(
          rankVotes,
          governance,
          powerMap,
          definition.rank_aggregation,
        );

      await this.objectUpdatesRepository.update(trimmed, {
        rank_score,
        rank_context,
        rank_decisive_event_seq,
      });
    } catch (e) {
      this.logger.error(
        `rank score: failed for update '${trimmed}': ${(e as Error).message}`,
      );
    }
  }
}
