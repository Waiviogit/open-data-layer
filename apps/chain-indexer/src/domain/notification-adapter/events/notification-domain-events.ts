/** In-process events consumed by NotificationAdapterService (not the Redis/Kafka contract). */

export const VOTE_CAST_NOTIFICATION_EVENT = 'notification.vote_cast';
export const FOLLOW_NOTIFICATION_EVENT = 'notification.follow';
export const OBJECT_CREATED_NOTIFICATION_EVENT = 'notification.object_created';
export const TRX_PROCESSED_NOTIFICATION_EVENT = 'notification.trx_processed';
export const BATCH_IMPORT_COMPLETED_NOTIFICATION_EVENT =
  'notification.batch_import_completed';

export class VoteCastNotificationPayload {
  constructor(
    public readonly objectId: string,
    public readonly updateId: string,
    public readonly voter: string,
    public readonly vote: string,
    public readonly blockNum: number,
    public readonly trxId: string,
    public readonly occurredAt: string,
  ) {}
}

export class FollowNotificationPayload {
  constructor(
    public readonly follower: string,
    public readonly following: string,
    public readonly action: 'follow' | 'unfollow',
    public readonly blockNum: number,
    public readonly trxId: string,
    public readonly occurredAt: string,
  ) {}
}

export class ObjectCreatedNotificationPayload {
  constructor(
    public readonly objectId: string,
    public readonly updateId: string,
    public readonly updateType: string,
    public readonly creator: string,
    public readonly blockNum: number,
    public readonly trxId: string,
    public readonly occurredAt: string,
  ) {}
}

export class TrxProcessedNotificationPayload {
  constructor(
    public readonly trxId: string,
    public readonly blockNum: number,
    public readonly occurredAt: string,
  ) {}
}

export class BatchImportCompletedNotificationPayload {
  constructor(
    public readonly cid: string,
    public readonly creator: string,
    public readonly blockNum: number,
    public readonly trxId: string,
    public readonly occurredAt: string,
  ) {}
}
