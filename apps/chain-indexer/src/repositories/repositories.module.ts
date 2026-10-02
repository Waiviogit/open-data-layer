import { Module } from '@nestjs/common';
import { ObjectsCoreRepository } from './objects-core.repository';
import { ObjectUpdatesRepository } from './object-updates.repository';
import { ValidityVotesRepository } from './validity-votes.repository';
import { RankVotesRepository } from './rank-votes.repository';
import { AccountsCurrentRepository } from './accounts-current.repository';
import { ObjectFavoriteRepository } from './object-favorite.repository';
import { ObjectOwnershipRepository } from './object-ownership.repository';
import { AggregatedObjectRepository } from './aggregated-object.repository';
import { PostsRepository } from './posts.repository';
import { PostRepliesRepository } from './post-replies.repository';
import { ThreadRepliesRepository } from './thread-replies.repository';
import { SocialGraphRepository } from './social-graph.repository';
import { ThreadsRepository } from './threads.repository';
import { PostSyncQueueRepository } from './post-sync-queue.repository';
import { PostReblogPendingRepository } from './post-reblog-pending.repository';
import { AccountSyncQueueRepository } from './account-sync-queue.repository';
import { CanonicalRecomputeRepository } from './canonical-recompute.repository';
import { SiteRegistryRepository } from './site-registry.repository';
import { ObjectCategoriesRepository } from './object-categories.repository';
import { ObjectCategoriesSyncQueueRepository } from './object-categories-sync-queue.repository';
import { ObjectCategoriesRelatedRepository } from './object-categories-related.repository';
import { ObjectCategoriesRelatedSyncQueueRepository } from './object-categories-related-sync-queue.repository';
import { ObjectTagCategoryItemsRepository } from './object-tag-category-items.repository';
import { ObjectTagCategoriesSyncQueueRepository } from './object-tag-categories-sync-queue.repository';
import { UserMetadataRepository } from './user-metadata.repository';
import { UserNotificationSettingsRepository } from './user-notification-settings.repository';
import { UserShopDeselectRepository } from './user-shop-deselect.repository';
import { UserObjectPowersRepository } from './user-object-powers.repository';
import { UserObjectFollowsRepository } from './user-object-follows.repository';
import { PostObjectRelatedImagesRepository } from './post-object-related-images.repository';
import { UserDelegationsRepository } from './user-delegations.repository';
import { UserRcDelegationsRepository } from './user-rc-delegations.repository';
import { UserAccountAuthsRepository } from './user-account-auths.repository';
import { HiveEngineSwapsRepository } from './hive-engine-swaps.repository';
import { HiveEngineDepositRecordsRepository } from './hive-engine-deposit-records.repository';
import { OblRepository } from './obl.repository';
import { ChannelsRepository } from './channels.repository';
import { MessagesRepository } from './messages.repository';

@Module({
  providers: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
    ObjectFavoriteRepository,
    ObjectOwnershipRepository,
    AggregatedObjectRepository,
    PostsRepository,
    PostRepliesRepository,
    SocialGraphRepository,
    ThreadsRepository,
    ThreadRepliesRepository,
    PostSyncQueueRepository,
    PostReblogPendingRepository,
    AccountSyncQueueRepository,
    CanonicalRecomputeRepository,
    SiteRegistryRepository,
    ObjectCategoriesRepository,
    ObjectCategoriesSyncQueueRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRelatedSyncQueueRepository,
    ObjectTagCategoryItemsRepository,
    ObjectTagCategoriesSyncQueueRepository,
    UserMetadataRepository,
    UserNotificationSettingsRepository,
    UserShopDeselectRepository,
    UserObjectPowersRepository,
    UserObjectFollowsRepository,
    PostObjectRelatedImagesRepository,
    UserDelegationsRepository,
    UserRcDelegationsRepository,
    UserAccountAuthsRepository,
    HiveEngineSwapsRepository,
    HiveEngineDepositRecordsRepository,
    OblRepository,
    ChannelsRepository,
    MessagesRepository,
  ],
  exports: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
    ObjectFavoriteRepository,
    ObjectOwnershipRepository,
    AggregatedObjectRepository,
    PostsRepository,
    PostRepliesRepository,
    SocialGraphRepository,
    ThreadsRepository,
    ThreadRepliesRepository,
    PostSyncQueueRepository,
    PostReblogPendingRepository,
    AccountSyncQueueRepository,
    CanonicalRecomputeRepository,
    SiteRegistryRepository,
    ObjectCategoriesRepository,
    ObjectCategoriesSyncQueueRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRelatedSyncQueueRepository,
    ObjectTagCategoryItemsRepository,
    ObjectTagCategoriesSyncQueueRepository,
    UserMetadataRepository,
    UserNotificationSettingsRepository,
    UserShopDeselectRepository,
    UserObjectPowersRepository,
    UserObjectFollowsRepository,
    PostObjectRelatedImagesRepository,
    UserDelegationsRepository,
    UserRcDelegationsRepository,
    UserAccountAuthsRepository,
    HiveEngineSwapsRepository,
    HiveEngineDepositRecordsRepository,
    OblRepository,
    ChannelsRepository,
    MessagesRepository,
  ],
})
export class RepositoriesModule {}
