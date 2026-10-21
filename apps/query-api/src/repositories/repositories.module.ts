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
import { UserPostDraftsRepository } from './user-post-drafts.repository';
import { UserAccountMutesRepository } from './user-account-mutes.repository';
import { ThreadsRepository } from './threads.repository';
import { ObjectCategoriesRelatedRepository } from './object-categories-related.repository';
import { ObjectCategoriesRepository } from './object-categories.repository';
import { UserMetadataRepository } from './user-metadata.repository';
import { UserNotificationSettingsRepository } from './user-notification-settings.repository';
import { UserShopDeselectRepository } from './user-shop-deselect.repository';
import { UserSubscriptionsRepository } from './user-subscriptions.repository';
import { UserObjectFollowsRepository } from './user-object-follows.repository';
import { UpdatesFeedRepository } from './updates-feed.repository';
import { SearchRepository } from './search.repository';
import { DiscoverRepository } from './discover.repository';
import { ObjectRefListRepository } from './object-ref-list.repository';
import { ObjectFieldReferencesRepository } from './object-field-references.repository';
import { PostObjectRelatedImagesRepository } from './post-object-related-images.repository';
import { UserFavoritesRepository } from './user-favorites.repository';
import { UserObjectExpertiseRepository } from './user-object-expertise.repository';
import { UserDelegationsRepository } from './user-delegations.repository';
import { UserRcDelegationsRepository } from './user-rc-delegations.repository';
import { UserAccountAuthsRepository } from './user-account-auths.repository';
import { WalletExemptionsRepository } from './wallet-exemptions.repository';
import { HiveEngineSwapsRepository } from './hive-engine-swaps.repository';
import { HiveEngineWaivAirdropsRepository } from './hive-engine-waiv-airdrops.repository';
import { HiveEngineDepositRecordsRepository } from './hive-engine-deposit-records.repository';
import { WaivGeneratedReportsRepository } from './waiv-generated-reports.repository';
import { OblRepository, OblOfferDraftsRepository } from './obl.repository';
import { MessagingRepository } from './messaging.repository';
import { ProfileFeedReadCursorRepository } from './profile-feed-read-cursor.repository';
import { PostRepliesRepository } from './post-replies.repository';
import { ThreadRepliesRepository } from './thread-replies.repository';
import { AffiliateObjectsRepository } from './affiliate-objects.repository';

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
    UserPostDraftsRepository,
    UserAccountMutesRepository,
    ThreadsRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRepository,
    UserMetadataRepository,
    UserNotificationSettingsRepository,
    UserShopDeselectRepository,
    UserSubscriptionsRepository,
    UserObjectFollowsRepository,
    UpdatesFeedRepository,
    SearchRepository,
    DiscoverRepository,
    ObjectRefListRepository,
    ObjectFieldReferencesRepository,
    PostObjectRelatedImagesRepository,
    UserFavoritesRepository,
    UserObjectExpertiseRepository,
    UserDelegationsRepository,
    UserRcDelegationsRepository,
    UserAccountAuthsRepository,
    WalletExemptionsRepository,
    HiveEngineSwapsRepository,
    HiveEngineWaivAirdropsRepository,
    HiveEngineDepositRecordsRepository,
    WaivGeneratedReportsRepository,
    OblRepository,
    OblOfferDraftsRepository,
    MessagingRepository,
    ProfileFeedReadCursorRepository,
    PostRepliesRepository,
    ThreadRepliesRepository,
    AffiliateObjectsRepository,
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
    UserPostDraftsRepository,
    UserAccountMutesRepository,
    ThreadsRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRepository,
    UserMetadataRepository,
    UserNotificationSettingsRepository,
    UserShopDeselectRepository,
    UserSubscriptionsRepository,
    UserObjectFollowsRepository,
    UpdatesFeedRepository,
    SearchRepository,
    DiscoverRepository,
    ObjectRefListRepository,
    ObjectFieldReferencesRepository,
    PostObjectRelatedImagesRepository,
    UserFavoritesRepository,
    UserObjectExpertiseRepository,
    UserDelegationsRepository,
    UserRcDelegationsRepository,
    UserAccountAuthsRepository,
    WalletExemptionsRepository,
    HiveEngineSwapsRepository,
    HiveEngineWaivAirdropsRepository,
    HiveEngineDepositRecordsRepository,
    WaivGeneratedReportsRepository,
    OblRepository,
    OblOfferDraftsRepository,
    MessagingRepository,
    ProfileFeedReadCursorRepository,
    PostRepliesRepository,
    ThreadRepliesRepository,
    AffiliateObjectsRepository,
  ],
})
export class RepositoriesModule {}
