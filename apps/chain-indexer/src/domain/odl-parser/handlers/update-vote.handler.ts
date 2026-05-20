import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NewValidityVote } from '@opden-data-layer/core';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import {
  ObjectUpdatesRepository,
  ObjectsCoreRepository,
  ValidityVotesRepository,
} from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateVotePayloadSchema } from '../odl-envelope.schema';
import { WriteGuardRunner } from '../guards';
import {
  GovernanceObjectMutatedEvent,
  GOVERNANCE_OBJECT_MUTATED_EVENT,
} from '../../governance/governance-object-mutated.event';
import {
  USER_OBJECT_POWERS_CREATE_EVENT,
  UserObjectPowersCreateEvent,
} from '../../user-object-powers/user-object-powers.events';
import {
  SITE_CANONICAL_RECOMPUTE_EVENT,
  SiteCanonicalRecomputeEvent,
} from '../../site-canonical/site-canonical-recompute.event';
import {
  GroupIdMutatedEvent,
  GROUP_ID_MUTATED_EVENT,
} from '../group-id-mutated.event';
import {
  CategoryMutatedEvent,
  CATEGORY_MUTATED_EVENT,
} from '../category-mutated.event';
import {
  TRX_PROCESSED_NOTIFICATION_EVENT,
  TrxProcessedNotificationPayload,
  VOTE_CAST_NOTIFICATION_EVENT,
  VoteCastNotificationPayload,
} from '../../notification-adapter/events/notification-domain-events';

@Injectable()
export class UpdateVoteHandler implements OdlActionHandler {
  readonly action = 'update_vote';
  private readonly logger = new Logger(UpdateVoteHandler.name);

  constructor(
    private readonly validityVotesRepository: ValidityVotesRepository,
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly writeGuardRunner: WriteGuardRunner,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateVotePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid update_vote payload: ${result.error.message}`);
      return;
    }

    const { voter, vote } = result.data;

    let update_id: string;
    if (result.data.create_event_id !== undefined) {
      const createIndex = ctx.eventIdIndexMap.get(result.data.create_event_id);
      if (createIndex === undefined) {
        this.logger.warn(
          `update_vote: create_event_id '${result.data.create_event_id}' not found in envelope; skipping`,
        );
        return;
      }
      update_id = `${ctx.transactionId}-${ctx.transactionIndex}-${ctx.operationIndex}-${createIndex}`;
    } else {
      update_id = result.data.update_id!;
    }

    const votedUpdate = await this.objectUpdatesRepository.findByUpdateId(update_id);
    if (!votedUpdate) {
      this.logger.warn(`update_vote: update_id '${update_id}' not found; skipping`);
      return;
    }

    const payloadObjectId = result.data.object_id;
    if (payloadObjectId !== undefined && payloadObjectId !== votedUpdate.object_id) {
      this.logger.warn(
        `update_vote: object_id mismatch for update_id '${update_id}'; skipping`,
      );
      return;
    }

    const object_id = votedUpdate.object_id;

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
      if (votedUpdate.update_type === UPDATE_TYPES.CATEGORY) {
        this.eventEmitter.emit(CATEGORY_MUTATED_EVENT, new CategoryMutatedEvent(object_id));
      }
      if (votedUpdate.update_type === UPDATE_TYPES.PRODUCT_GROUP_ID) {
        this.eventEmitter.emit(GROUP_ID_MUTATED_EVENT, new GroupIdMutatedEvent(object_id));
      }
      if (votedUpdate.update_type === UPDATE_TYPES.DESCRIPTION) {
        this.eventEmitter.emit(
          SITE_CANONICAL_RECOMPUTE_EVENT,
          new SiteCanonicalRecomputeEvent(object_id),
        );
      }
      this.eventEmitter.emit(
        GOVERNANCE_OBJECT_MUTATED_EVENT,
        new GovernanceObjectMutatedEvent(object_id),
      );
      this.eventEmitter.emit(
        USER_OBJECT_POWERS_CREATE_EVENT,
        new UserObjectPowersCreateEvent(ctx.creator),
      );
      this.emitTrxProcessed(ctx);
      return;
    }

    const row: NewValidityVote = {
      update_id,
      object_id,
      voter,
      vote,
      event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
    };

    await this.validityVotesRepository.create(row);
    if (votedUpdate.update_type === UPDATE_TYPES.CATEGORY) {
      this.eventEmitter.emit(CATEGORY_MUTATED_EVENT, new CategoryMutatedEvent(object_id));
    }
    if (votedUpdate.update_type === UPDATE_TYPES.PRODUCT_GROUP_ID) {
      this.eventEmitter.emit(GROUP_ID_MUTATED_EVENT, new GroupIdMutatedEvent(object_id));
    }
    if (votedUpdate.update_type === UPDATE_TYPES.DESCRIPTION) {
      this.eventEmitter.emit(
        SITE_CANONICAL_RECOMPUTE_EVENT,
        new SiteCanonicalRecomputeEvent(object_id),
      );
    }
    this.eventEmitter.emit(
      GOVERNANCE_OBJECT_MUTATED_EVENT,
      new GovernanceObjectMutatedEvent(object_id),
    );
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_CREATE_EVENT,
      new UserObjectPowersCreateEvent(ctx.creator),
    );
    this.eventEmitter.emit(
      VOTE_CAST_NOTIFICATION_EVENT,
      new VoteCastNotificationPayload(
        object_id,
        update_id,
        voter,
        vote,
        ctx.blockNum,
        ctx.transactionId,
        ctx.timestamp,
      ),
    );
    this.emitTrxProcessed(ctx);
  }

  private emitTrxProcessed(ctx: OdlEventContext): void {
    this.eventEmitter.emit(
      TRX_PROCESSED_NOTIFICATION_EVENT,
      new TrxProcessedNotificationPayload(
        ctx.transactionId,
        ctx.blockNum,
        ctx.timestamp,
      ),
    );
  }
}
