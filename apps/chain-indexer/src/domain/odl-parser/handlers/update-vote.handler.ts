import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NewValidityVote } from '@opden-data-layer/odl-db-types';

import { UPDATE_TYPES } from '@opden-data-layer/core';
import {
  OBJECT_STATUS_RECOMPUTE_EVENT,
  ObjectStatusRecomputeEvent,
} from '../object-status-created.event';
import {
  ObjectUpdatesRepository,
  ObjectsCoreRepository,
  ValidityVotesRepository,
} from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateVotePayloadSchema } from '../odl-envelope.schema';
import { resolveEventAccount } from '../normalize-event-account';
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
  TagCategoryItemMutatedEvent,
  TAG_CATEGORY_ITEM_MUTATED_EVENT,
} from '../tag-category-item-mutated.event';
import { NotificationEmitterService } from '../../notification-adapter/notification-emitter.service';

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
    private readonly notificationEmitter: NotificationEmitterService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateVotePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid update_vote payload: ${result.error.message}`);
      return;
    }

    const { vote } = result.data;
    const { account: voter, mismatch } = resolveEventAccount(
      ctx.creator,
      result.data.voter,
    );
    if (mismatch) {
      this.logger.warn(
        `update_vote: payload voter '${result.data.voter}' does not match posting auth '${ctx.creator}'; using posting auth`,
      );
    }

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
      if (
        votedUpdate.update_type === UPDATE_TYPES.TAG_CATEGORY ||
        votedUpdate.update_type === UPDATE_TYPES.TAG_CATEGORY_ITEM
      ) {
        this.eventEmitter.emit(
          TAG_CATEGORY_ITEM_MUTATED_EVENT,
          new TagCategoryItemMutatedEvent(object_id),
        );
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
      if (votedUpdate.update_type === UPDATE_TYPES.STATUS) {
        this.eventEmitter.emit(
          OBJECT_STATUS_RECOMPUTE_EVENT,
          new ObjectStatusRecomputeEvent(object_id),
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

    const existing = await this.validityVotesRepository.findByUpdateIdAndVoter(
      update_id,
      voter,
    );
    if (existing?.vote === vote) {
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

    if (existing) {
      await this.validityVotesRepository.update(update_id, voter, {
        vote,
        event_seq: ctx.eventSeq,
        transaction_id: ctx.transactionId,
      });
    } else {
      await this.validityVotesRepository.create(row);
    }
    if (votedUpdate.update_type === UPDATE_TYPES.CATEGORY) {
      this.eventEmitter.emit(CATEGORY_MUTATED_EVENT, new CategoryMutatedEvent(object_id));
    }
    if (
      votedUpdate.update_type === UPDATE_TYPES.TAG_CATEGORY ||
      votedUpdate.update_type === UPDATE_TYPES.TAG_CATEGORY_ITEM
    ) {
      this.eventEmitter.emit(
        TAG_CATEGORY_ITEM_MUTATED_EVENT,
        new TagCategoryItemMutatedEvent(object_id),
      );
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
    if (votedUpdate.update_type === UPDATE_TYPES.STATUS) {
      this.eventEmitter.emit(
        OBJECT_STATUS_RECOMPUTE_EVENT,
        new ObjectStatusRecomputeEvent(object_id),
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
    const isRejectVote = vote === 'against';
    if (isRejectVote) {
      this.notificationEmitter.emitWithContext(
        this.notificationEmitter.odlContext(ctx),
        {
          type: 'object_update_reject',
          objectId: object_id,
          actor: voter,
          payload: {
            updateId: update_id,
            updateType: votedUpdate.update_type,
            objectName: null,
            authorPermlink: object_id,
            voter,
          },
        },
      );
    } else {
      this.notificationEmitter.emitWithContext(
        this.notificationEmitter.odlContext(ctx),
        {
          type: 'update_vote_cast',
          objectId: object_id,
          actor: voter,
          payload: {
            updateId: update_id,
            vote,
            updateType: votedUpdate.update_type,
            objectName: null,
            authorPermlink: object_id,
          },
        },
      );
    }
    this.emitTrxProcessed(ctx);
  }

  private emitTrxProcessed(ctx: OdlEventContext): void {
    this.notificationEmitter.emitTrxProcessedOdl(ctx);
  }
}
