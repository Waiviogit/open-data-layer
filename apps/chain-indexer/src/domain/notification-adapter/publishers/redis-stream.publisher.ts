import { Injectable, Logger } from '@nestjs/common';
import { RedisClientFactory } from '@opden-data-layer/clients';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  NOTIFICATION_STREAM_DATA_FIELD,
  NOTIFICATION_STREAM_KEY,
} from '../../../constants/notification-stream.constants';
import type { INotificationPublisher } from '../notification-publisher.interface';

@Injectable()
export class RedisStreamNotificationPublisher implements INotificationPublisher {
  private readonly logger = new Logger(RedisStreamNotificationPublisher.name);

  constructor(private readonly redisFactory: RedisClientFactory) {}

  async publish(event: NotificationEvent): Promise<void> {
    try {
      const redis = this.redisFactory.getClient();
      await redis.xAdd(NOTIFICATION_STREAM_KEY, {
        [NOTIFICATION_STREAM_DATA_FIELD]: JSON.stringify(event),
      });
    } catch (err) {
      this.logger.error((err as Error).message);
      throw err;
    }
  }
}
