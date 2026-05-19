import { Module, forwardRef } from '@nestjs/common';
import { RedisClientModule } from '@opden-data-layer/clients';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WsModule } from '../ws/ws.module';
import { NotificationFeedService } from './notification-feed.service';
import { NotificationRouterService } from './notification-router.service';

@Module({
  imports: [
    RedisClientModule,
    RepositoriesModule,
    forwardRef(() => WsModule),
  ],
  providers: [NotificationFeedService, NotificationRouterService],
  exports: [NotificationRouterService, NotificationFeedService],
})
export class DomainModule {}
