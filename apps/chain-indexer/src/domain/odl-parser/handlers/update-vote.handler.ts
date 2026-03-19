import { Injectable, Logger } from '@nestjs/common';
import type { NewValidityVote } from '@opden-data-layer/core';
import {
  ObjectUpdatesRepository,
  ObjectsCoreRepository,
  ValidityVotesRepository,
} from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateVotePayloadSchema } from '../odl-envelope.schema';
import { WriteGuardRunner } from '../guards';

@Injectable()
export class UpdateVoteHandler implements OdlActionHandler {
  readonly action = 'update_vote';
  private readonly logger = new Logger(UpdateVoteHandler.name);

  constructor(
    private readonly validityVotesRepository: ValidityVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly writeGuardRunner: WriteGuardRunner,
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

    const core = await this.objectsCoreRepository.findByObjectId(object_id);
    if (!core) {
      this.logger.warn(`update_vote: object '${object_id}' not found; skipping`);
      return;
    }

    const guardRejection = this.writeGuardRunner.check({
      action: 'update_vote',
      object_type: core.object_type,
      object_id: core.object_id,
      object_creator: core.creator,
      event_creator: ctx.creator,
    });
    if (guardRejection) {
      this.logger.warn(`update_vote rejected by guard: ${guardRejection}`);
      return;
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
