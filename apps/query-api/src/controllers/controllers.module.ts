import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DraftsModule } from '../domain/drafts/drafts.module';
import { FeedModule } from '../domain/feed';
import { MessagingModule } from '../domain/messaging';
import { ObjectsModule } from '../domain/objects';
import { UsersModule } from '../domain/users';
import { CategoriesModule } from '../domain/categories/categories.module';
import { ShopModule } from '../domain/shop/shop.module';
import { SocialModule } from '../domain/social/social.module';
import { FavoritesModule } from '../domain/favorites/favorites.module';
import { ExpertiseModule } from '../domain/expertise/expertise.module';
import { ObjectUpdatesModule } from '../domain/object-updates';
import { CurrencyController } from './currency.controller';
import { ObjectsController } from './objects.controller';
import { UserPostDraftsController } from './user-post-drafts.controller';
import { PostsController } from './posts.controller';
import { UsersController } from './users.controller';
import { UserThreadsController } from './user-threads.controller';
import { UserActivityController } from './user-activity.controller';
import { SearchController } from './search.controller';
import { SearchModule } from '../domain/search';
import { DiscoverController } from './discover.controller';
import { CategoriesController } from './categories.controller';
import { DiscoverModule } from '../domain/discover';
import { WalletModule } from '../domain/wallet';
import { OblModule } from '../domain/obl';
import { UserWalletController } from './user-wallet.controller';
import { HiveWalletAdvancedReportController } from './hive-wallet-advanced-report.controller';
import { WaivWalletAdvancedReportController } from './waiv-wallet-advanced-report.controller';
import { WaivWalletGeneratedReportController } from './waiv-wallet-generated-report.controller';
import { OblOfferDraftsController } from './obl-offer-drafts.controller';
import { OblController } from './obl.controller';
import { ChannelsController } from './channels.controller';

@Module({
  imports: [
    ObjectsModule,
    ObjectUpdatesModule,
    UsersModule,
    FeedModule,
    DraftsModule,
    AuthModule,
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
  controllers: [
    ObjectsController,
    UsersController,
    UserThreadsController,
    UserActivityController,
    UserWalletController,
    HiveWalletAdvancedReportController,
    WaivWalletAdvancedReportController,
    WaivWalletGeneratedReportController,
    PostsController,
    UserPostDraftsController,
    CurrencyController,
    SearchController,
    DiscoverController,
    CategoriesController,
    OblOfferDraftsController,
    OblController,
    ChannelsController,
  ],
})
export class ControllersModule {}
