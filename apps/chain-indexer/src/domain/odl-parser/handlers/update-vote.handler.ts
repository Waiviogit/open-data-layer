import { Injectable, Logger } from '@nestjs/common';
import type { NewValidityVote } from '@opden-data-layer/core';
import { ObjectUpdatesRepository, ValidityVotesRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateVotePayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class UpdateVoteHandler implements OdlActionHandler {
  readonly action = 'update_vote';
  private readonly logger = new Logger(UpdateVoteHandler.name);

  constructor(
    private readonly validityVotesRepository: ValidityVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateVotePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid update_vote payload: ${result.error.message}`);
      return;
    }

    const { update_id, voter, vote, transaction_id } = result.data;
    let { object_id } = result.data;

    if (!object_id) {
      const update = await this.objectUpdatesRepository.findByUpdateId(update_id);
      if (!update) {
        this.logger.warn(`update_vote: update_id '${update_id}' not found; skipping`);
        return;
      }
      object_id = update.object_id;
    }

    if (vote === 'remove') {
      await this.validityVotesRepository.delete(update_id, voter);
      return;
    }

    const row: NewValidityVote = {
      update_id,
      object_id,
      voter,
      vote,
      event_seq: ctx.eventSeq,
      transaction_id,
    };

    await this.validityVotesRepository.create(row);
  }
}
