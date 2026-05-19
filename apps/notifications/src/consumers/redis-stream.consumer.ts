import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisClientFactory } from '@opden-data-layer/clients';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  NOTIFICATION_CONSUMER_GROUP,
  NOTIFICATION_STREAM_DATA_FIELD,
  NOTIFICATION_STREAM_KEY,
} from '../constants/notification-stream.constants';
import { NotificationRouterService } from '../domain/notification-router.service';
import type { INotificationConsumer } from './notification-consumer.interface';

@Injectable()
export class RedisStreamNotificationConsumer implements INotificationConsumer {
  private readonly logger = new Logger(RedisStreamNotificationConsumer.name);
  private readonly consumerName = `${process.env.HOSTNAME ?? 'notifications'}-${process.pid}`;
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly redisFactory: RedisClientFactory,
    private readonly router: NotificationRouterService,
  ) {}

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    const redis = this.redisFactory.getClient();
    await redis.xGroupCreate(
      NOTIFICATION_STREAM_KEY,
      NOTIFICATION_CONSUMER_GROUP,
      '$',
      true,
    );
    this.running = true;
    this.loopPromise = this.pollLoop();
    this.logger.log(
      `Redis stream consumer started (group=${NOTIFICATION_CONSUMER_GROUP}, consumer=${this.consumerName})`,
    );
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }
    this.logger.log('Redis stream consumer stopped');
  }

  private async pollLoop(): Promise<void> {
    const redis = this.redisFactory.getClient();
    while (this.running) {
      try {
        const entries = await redis.xReadGroup(
          NOTIFICATION_CONSUMER_GROUP,
          this.consumerName,
          [{ key: NOTIFICATION_STREAM_KEY, id: '>' }],
          { count: 10, blockMs: 2000 },
        );

        for (const entry of entries) {
          await this.processEntry(entry.id, entry.fields);
        }
      } catch (err) {
        if (this.running) {
          this.logger.error(`Stream poll error: ${(err as Error).message}`);
          await this.sleep(1000);
        }
      }
    }
  }

  private async processEntry(
    entryId: string,
    fields: Record<string, string>,
  ): Promise<void> {
    const redis = this.redisFactory.getClient();
    const raw = fields[NOTIFICATION_STREAM_DATA_FIELD];
    if (!raw) {
      this.logger.warn(`Stream entry ${entryId} missing data field`);
      await redis.xAck(
        NOTIFICATION_STREAM_KEY,
        NOTIFICATION_CONSUMER_GROUP,
        entryId,
      );
      return;
    }

    let event: NotificationEvent;
    try {
      event = JSON.parse(raw) as NotificationEvent;
    } catch {
      this.logger.warn(`Stream entry ${entryId} has invalid JSON`);
      await redis.xAck(
        NOTIFICATION_STREAM_KEY,
        NOTIFICATION_CONSUMER_GROUP,
        entryId,
      );
      return;
    }

    try {
      await this.router.route(event);
      await redis.xAck(
        NOTIFICATION_STREAM_KEY,
        NOTIFICATION_CONSUMER_GROUP,
        entryId,
      );
    } catch (err) {
      this.logger.error(
        `Failed to route entry ${entryId}: ${(err as Error).message}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
