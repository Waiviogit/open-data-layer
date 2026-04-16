/**
 * Cross-service integration event (e.g. Redis Stream / Kafka); stub consumer uses this shape later.
 */
export type NotificationEventType =
  | 'trx_processed'
  | 'object_created'
  | 'update_vote_cast';

export interface NotificationEvent {
  readonly type: NotificationEventType;
  readonly occurredAt: string;
  readonly blockNum: number;
  readonly trxId: string | null;
  readonly objectId: string | null;
  readonly actor: string | null;
  readonly payload: Record<string, unknown>;
}
