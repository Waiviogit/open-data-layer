import { Module } from '@nestjs/common';
import { NotificationAdapterService } from './notification-adapter.service';
import { NOTIFICATION_PUBLISHER } from './notification-publisher.interface';
import { RedisStreamNotificationPublisher } from './publishers/redis-stream.publisher';

@Module({
  providers: [
    NotificationAdapterService,
    {
      provide: NOTIFICATION_PUBLISHER,
      useClass: RedisStreamNotificationPublisher,
    },
  ],
})
export class NotificationAdapterModule {}
