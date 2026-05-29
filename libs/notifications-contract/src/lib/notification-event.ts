/**
 * Cross-service notification integration event (Redis Stream / Kafka).
 * JSON serialization of this shape is the stable contract between chain-indexer and notifications.
 */
export type NotificationEventType =
  | 'update_vote_cast'
  | 'object_created'
  | 'follow'
  | 'trx_processed'
  | 'batch_import_completed';

export interface NotificationEvent {
  readonly type: NotificationEventType;
  /** ISO 8601 */
  readonly occurredAt: string;
  readonly blockNum: number;
  readonly trxId: string | null;
  readonly objectId: string | null;
  /** Hive account that performed the action */
  readonly actor: string | null;
  readonly payload: Record<string, unknown>;
}
