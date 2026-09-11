import { Module, forwardRef } from '@nestjs/common';
import { RedisClientModule } from '@opden-data-layer/clients';
import { CurrencyModule } from '@opden-data-layer/currency';
import { KYSELY } from '../database';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WsModule } from '../ws/ws.module';
import { NotificationFeedService } from './notification-feed.service';
import { NotificationRouterService } from './notification-router.service';
import {
  DirectRecipientStrategy,
  ObjectAudienceRecipientStrategy,
  PostAuthorRecipientStrategy,
  RecipientStrategyRegistry,
  SelfActorRecipientStrategy,
  ThreadAuthorFollowerRecipientStrategy,
  UserBellRecipientStrategy,
  ChannelMessagingRecipientStrategy,
  OblRecipientStrategy,
} from './routing/recipient-strategies';
import { NotificationAudienceService } from './settings/notification-audience.service';
import { NotificationSettingsService } from './settings/notification-settings.service';
import { HiveGlobalPropertiesCache } from './hive-global-properties.cache';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    RedisClientModule,
    RepositoriesModule,
    CurrencyModule.register({ kyselyToken: KYSELY, includeCollectService: false }),
    forwardRef(() => WsModule),
    TelegramModule,
  ],
  providers: [
    NotificationFeedService,
    NotificationRouterService,
    DirectRecipientStrategy,
    PostAuthorRecipientStrategy,
    SelfActorRecipientStrategy,
    ObjectAudienceRecipientStrategy,
    UserBellRecipientStrategy,
    ThreadAuthorFollowerRecipientStrategy,
    ChannelMessagingRecipientStrategy,
    OblRecipientStrategy,
    RecipientStrategyRegistry,
    NotificationSettingsService,
    NotificationAudienceService,
    HiveGlobalPropertiesCache,
  ],
  exports: [NotificationRouterService, NotificationFeedService],
})
export class DomainModule {}
