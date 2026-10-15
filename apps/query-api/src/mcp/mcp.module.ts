import { Module } from '@nestjs/common';
import { CategoriesModule } from '../domain/categories/categories.module';
import { DiscoverModule } from '../domain/discover';
import { FeedModule } from '../domain/feed';
import { ObjectUpdatesModule } from '../domain/object-updates';
import { ObjectsModule } from '../domain/objects';
import { SearchModule } from '../domain/search';
import { ShopModule } from '../domain/shop/shop.module';
import { SocialModule } from '../domain/social/social.module';
import { FavoritesModule } from '../domain/favorites/favorites.module';
import { ExpertiseModule } from '../domain/expertise/expertise.module';
import { UsersModule } from '../domain/users';
import { WalletModule } from '../domain/wallet';
import { OblModule } from '../domain/obl';
import { MessagingModule } from '../domain/messaging/messaging.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [
    ObjectsModule,
    ObjectUpdatesModule,
    UsersModule,
    FeedModule,
    CategoriesModule,
    ShopModule,
    SocialModule,
    FavoritesModule,
    ExpertiseModule,
    SearchModule,
    DiscoverModule,
    WalletModule,
    OblModule,
    MessagingModule,
  ],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
