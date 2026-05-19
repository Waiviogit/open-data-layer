import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { ConsumerBootstrapService } from './consumer-bootstrap.service';
import { NOTIFICATION_CONSUMER } from './notification-consumer.interface';
import { RedisStreamNotificationConsumer } from './redis-stream.consumer';

@Module({
  imports: [DomainModule],
  providers: [
    {
      provide: NOTIFICATION_CONSUMER,
      useClass: RedisStreamNotificationConsumer,
    },
    ConsumerBootstrapService,
  ],
})
export class ConsumersModule {}
