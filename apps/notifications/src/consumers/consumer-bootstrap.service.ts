import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { INotificationConsumer } from './notification-consumer.interface';
import { NOTIFICATION_CONSUMER } from './notification-consumer.interface';

@Injectable()
export class ConsumerBootstrapService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(NOTIFICATION_CONSUMER)
    private readonly consumer: INotificationConsumer,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.stop();
  }
}
