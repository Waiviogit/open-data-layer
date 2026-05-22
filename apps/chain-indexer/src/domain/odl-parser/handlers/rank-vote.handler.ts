import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NewRankVote } from '@opden-data-layer/core';
import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import {
  ObjectUpdatesRepository,
  ObjectsCoreRepository,
  RankVotesRepository,
} from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { rankVotePayloadSchema } from '../odl-envelope.schema';
import { WriteGuardRunner } from '../guards';
import {
  GovernanceObjectMutatedEvent,
  GOVERNANCE_OBJECT_MUTATED_EVENT,
} from '../../governance/governance-object-mutated.event';
import {
  USER_OBJECT_POWERS_CREATE_EVENT,
  UserObjectPowersCreateEvent,
} from '../../user-object-powers/user-object-powers.events';
import { RankScoreService } from '../../rank-score/rank-score.service';

@Injectable()
export class RankVoteHandler implements OdlActionHandler {
  readonly action = 'rank_vote';
  private readonly logger = new Logger(RankVoteHandler.name);

  constructor(
    private readonly rankVotesRepository: RankVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly writeGuardRunner: WriteGuardRunner,
    private readonly eventEmitter: EventEmitter2,
    private readonly rankScoreService: RankScoreService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = rankVotePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid rank_vote payload: ${result.error.message}`);
      return;
    }

    const { voter, rank, rank_context } = result.data;
    let { object_id } = result.data;

    let update_id: string;
    if (result.data.create_event_id !== undefined) {
      const createIndex = ctx.eventIdIndexMap.get(result.data.create_event_id);
      if (createIndex === undefined) {
        this.logger.warn(
          `rank_vote: create_event_id '${result.data.create_event_id}' not found in envelope; skipping`,
        );
        return;
      }
      update_id = `${ctx.transactionId}-${ctx.transactionIndex}-${ctx.operationIndex}-${createIndex}`;
    } else {
      update_id = result.data.update_id!;
    }

    if (!object_id) {
      const update = await this.objectUpdatesRepository.findByUpdateId(update_id);
      if (!update) {
        this.logger.warn(`rank_vote: update_id '${update_id}' not found; skipping`);
        return;
      }
      object_id = update.object_id;
    }

    const core = await this.objectsCoreRepository.findByObjectId(object_id);
    if (!core) {
      this.logger.warn(`rank_vote: object '${object_id}' not found; skipping`);
      return;
    }

    const votedUpdate = await this.objectUpdatesRepository.findByUpdateId(update_id);
    if (!votedUpdate) {
      this.logger.warn(`rank_vote: update_id '${update_id}' not found; skipping`);
      return;
    }

    const def = UPDATE_REGISTRY[votedUpdate.update_type];
    if (!def || def.cardinality !== 'multi') {
      this.logger.warn(
        `rank_vote: update_type '${votedUpdate.update_type}' is not multi-cardinality; skipping (UNSUPPORTED_RANK_TARGET)`,
      );
      return;
    }

    const guardRejection = this.writeGuardRunner.check({
      action: 'rank_vote',
      object_type: core.object_type,
      object_id: core.object_id,
      object_creator: core.creator,
      event_creator: ctx.creator,
    });
    if (guardRejection) {
      this.logger.warn(`rank_vote rejected by guard: ${guardRejection}`);
      return;
    }

    const existing = await this.rankVotesRepository.findByUpdateIdVoterAndContext(
      update_id,
      voter,
      rank_context,
    );
    if (existing?.rank === rank) {
      return;
    }

    const row: NewRankVote = {
      update_id,
      object_id,
      voter,
      rank,
      rank_context,
      event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
    };

    if (existing) {
      await this.rankVotesRepository.update(update_id, voter, rank_context, {
        rank,
        event_seq: ctx.eventSeq,
        transaction_id: ctx.transactionId,
      });
    } else {
      await this.rankVotesRepository.create(row);
    }
    this.eventEmitter.emit(
      GOVERNANCE_OBJECT_MUTATED_EVENT,
      new GovernanceObjectMutatedEvent(object_id),
    );
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_CREATE_EVENT,
      new UserObjectPowersCreateEvent(ctx.creator),
    );
    await this.rankScoreService.recalculateForUpdateId(update_id);
  }
}
