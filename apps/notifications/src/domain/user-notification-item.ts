import type { NotificationEventType } from '@opden-data-layer/notifications-contract';

/** One entry in a user's Redis notification list */
export interface UserNotificationItem {
  readonly id: string;
  readonly type: NotificationEventType;
  readonly occurredAt: string;
  readonly blockNum: number;
  readonly trxId: string | null;
  readonly objectId: string | null;
  readonly actor: string | null;
  readonly payload: Record<string, unknown>;
}
