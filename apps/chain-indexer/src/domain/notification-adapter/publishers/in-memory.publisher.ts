import { Injectable } from '@nestjs/common';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import type { INotificationPublisher } from '../notification-publisher.interface';

@Injectable()
export class InMemoryNotificationPublisher implements INotificationPublisher {
  readonly published: NotificationEvent[] = [];

  async publish(event: NotificationEvent): Promise<void> {
    this.published.push(event);
  }
}
