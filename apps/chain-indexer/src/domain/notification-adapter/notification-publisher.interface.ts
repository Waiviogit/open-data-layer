import type { NotificationEvent } from '@opden-data-layer/notifications-contract';

export const NOTIFICATION_PUBLISHER = Symbol('NOTIFICATION_PUBLISHER');

export interface INotificationPublisher {
  publish(event: NotificationEvent): Promise<void>;
}
