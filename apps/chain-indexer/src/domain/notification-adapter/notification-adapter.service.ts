import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  BATCH_IMPORT_COMPLETED_NOTIFICATION_EVENT,
  BatchImportCompletedNotificationPayload,
  FOLLOW_NOTIFICATION_EVENT,
  FollowNotificationPayload,
  OBJECT_CREATED_NOTIFICATION_EVENT,
  ObjectCreatedNotificationPayload,
  TRX_PROCESSED_NOTIFICATION_EVENT,
  TrxProcessedNotificationPayload,
  VOTE_CAST_NOTIFICATION_EVENT,
  VoteCastNotificationPayload,
} from './events/notification-domain-events';
import {
  INotificationPublisher,
  NOTIFICATION_PUBLISHER,
} from './notification-publisher.interface';

@Injectable()
export class NotificationAdapterService {
  private readonly logger = new Logger(NotificationAdapterService.name);

  constructor(
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly publisher: INotificationPublisher,
  ) {}

  @OnEvent(VOTE_CAST_NOTIFICATION_EVENT)
  async onVoteCast(payload: VoteCastNotificationPayload): Promise<void> {
    await this.publish({
      type: 'update_vote_cast',
      occurredAt: payload.occurredAt,
      blockNum: payload.blockNum,
      trxId: payload.trxId,
      objectId: payload.objectId,
      actor: payload.voter,
      payload: {
        updateId: payload.updateId,
        vote: payload.vote,
      },
    });
  }

  @OnEvent(FOLLOW_NOTIFICATION_EVENT)
  async onFollow(payload: FollowNotificationPayload): Promise<void> {
    await this.publish({
      type: 'follow',
      occurredAt: payload.occurredAt,
      blockNum: payload.blockNum,
      trxId: payload.trxId,
      objectId: null,
      actor: payload.follower,
      payload: {
        following: payload.following,
        action: payload.action,
      },
    });
  }

  @OnEvent(OBJECT_CREATED_NOTIFICATION_EVENT)
  async onObjectCreated(
    payload: ObjectCreatedNotificationPayload,
  ): Promise<void> {
    await this.publish({
      type: 'object_created',
      occurredAt: payload.occurredAt,
      blockNum: payload.blockNum,
      trxId: payload.trxId,
      objectId: payload.objectId,
      actor: payload.creator,
      payload: {
        updateId: payload.updateId,
        updateType: payload.updateType,
      },
    });
  }

  @OnEvent(TRX_PROCESSED_NOTIFICATION_EVENT)
  async onTrxProcessed(payload: TrxProcessedNotificationPayload): Promise<void> {
    await this.publish({
      type: 'trx_processed',
      occurredAt: payload.occurredAt,
      blockNum: payload.blockNum,
      trxId: payload.trxId,
      objectId: null,
      actor: null,
      payload: {},
    });
  }

  @OnEvent(BATCH_IMPORT_COMPLETED_NOTIFICATION_EVENT)
  async onBatchImportCompleted(
    payload: BatchImportCompletedNotificationPayload,
  ): Promise<void> {
    await this.publish({
      type: 'batch_import_completed',
      occurredAt: payload.occurredAt,
      blockNum: payload.blockNum,
      trxId: payload.trxId,
      objectId: null,
      actor: payload.creator,
      payload: { cid: payload.cid },
    });
  }

  private async publish(event: NotificationEvent): Promise<void> {
    try {
      await this.publisher.publish(event);
    } catch (err) {
      this.logger.error(
        `Failed to publish notification ${event.type}: ${(err as Error).message}`,
      );
    }
  }
}
