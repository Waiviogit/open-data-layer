import { Injectable, Logger } from '@nestjs/common';
import type { INotificationConsumer } from './notification-consumer.interface';

@Injectable()
export class NoOpNotificationConsumer implements INotificationConsumer {
  private readonly logger = new Logger(NoOpNotificationConsumer.name);

  async start(): Promise<void> {
    this.logger.warn('NoOp notification consumer active; Redis Streams not connected');
  }

  async stop(): Promise<void> {
    this.logger.log('NoOp notification consumer stopped');
  }
}
