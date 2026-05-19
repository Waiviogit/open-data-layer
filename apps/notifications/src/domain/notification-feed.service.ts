import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisClientFactory } from '@opden-data-layer/clients';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  NOTIFICATION_EXPIRY_SEC,
  NOTIFICATION_LIST_MAX,
  notificationListKey,
} from '../constants/notification-feed.constants';
import { ConnectionRegistryService } from '../ws/connection-registry.service';
import { wsSendJson } from '../ws/ws-message';
import type { UserNotificationItem } from './user-notification-item';

@Injectable()
export class NotificationFeedService {
  private readonly logger = new Logger(NotificationFeedService.name);

  constructor(
    private readonly redisFactory: RedisClientFactory,
    private readonly connectionRegistry: ConnectionRegistryService,
  ) {}

  buildItemFromEvent(event: NotificationEvent): UserNotificationItem {
    return {
      id: randomUUID(),
      type: event.type,
      occurredAt: event.occurredAt,
      blockNum: event.blockNum,
      trxId: event.trxId,
      objectId: event.objectId,
      actor: event.actor,
      payload: event.payload,
    };
  }

  async addToFeed(username: string, item: UserNotificationItem): Promise<void> {
    const key = notificationListKey(username);
    const serialized = JSON.stringify(item);
    try {
      const redis = this.redisFactory.getClient();
      const pipe = redis.pipeline();
      pipe.lPush(key, serialized);
      pipe.expire(key, NOTIFICATION_EXPIRY_SEC);
      pipe.lTrim(key, 0, NOTIFICATION_LIST_MAX - 1);
      await pipe.exec();
    } catch (err) {
      this.logger.error(
        `addToFeed failed for ${username}: ${(err as Error).message}`,
      );
      return;
    }
    this.pushLive(username, item);
  }

  async getFeed(username: string): Promise<UserNotificationItem[]> {
    const key = notificationListKey(username);
    try {
      const redis = this.redisFactory.getClient();
      const raw = await redis.lRange(key, 0, -1);
      const items: UserNotificationItem[] = [];
      for (const entry of raw) {
        try {
          items.push(JSON.parse(entry) as UserNotificationItem);
        } catch {
          this.logger.warn(`Skipping corrupt notification entry for ${username}`);
        }
      }
      return items;
    } catch (err) {
      this.logger.error(
        `getFeed failed for ${username}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private pushLive(username: string, item: UserNotificationItem): void {
    const sockets = this.connectionRegistry.getSocketsForUser(username);
    for (const client of sockets) {
      wsSendJson(client, 'notification', item);
    }
  }
}
