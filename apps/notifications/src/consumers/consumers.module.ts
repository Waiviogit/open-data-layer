import { Module } from '@nestjs/common';
import { ConsumerBootstrapService } from './consumer-bootstrap.service';
import { NoOpNotificationConsumer } from './no-op.consumer';
import { NOTIFICATION_CONSUMER } from './notification-consumer.interface';

@Module({
  providers: [
    {
      provide: NOTIFICATION_CONSUMER,
      useClass: NoOpNotificationConsumer,
    },
    ConsumerBootstrapService,
  ],
})
export class ConsumersModule {}
