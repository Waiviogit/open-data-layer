import { Injectable, Logger } from '@nestjs/common';
import type { NewRankVote } from '@opden-data-layer/core';
import { ObjectUpdatesRepository, RankVotesRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { rankVotePayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class RankVoteHandler implements OdlActionHandler {
  readonly action = 'rank_vote';
  private readonly logger = new Logger(RankVoteHandler.name);

  constructor(
    private readonly rankVotesRepository: RankVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = rankVotePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid rank_vote payload: ${result.error.message}`);
      return;
    }

    const { update_id, voter, rank, rank_context, transaction_id } = result.data;
    let { object_id } = result.data;

    if (!object_id) {
      const update = await this.objectUpdatesRepository.findByUpdateId(update_id);
      if (!update) {
        this.logger.warn(`rank_vote: update_id '${update_id}' not found; skipping`);
        return;
      }
      object_id = update.object_id;
    }

    const row: NewRankVote = {
      update_id,
      object_id,
      voter,
      rank,
      rank_context,
      event_seq: ctx.eventSeq,
      transaction_id,
    };

    await this.rankVotesRepository.create(row);
  }
}
