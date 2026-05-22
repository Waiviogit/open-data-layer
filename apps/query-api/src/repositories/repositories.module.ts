import { Module } from '@nestjs/common';
import { ObjectsCoreRepository } from './objects-core.repository';
import { ObjectUpdatesRepository } from './object-updates.repository';
import { ValidityVotesRepository } from './validity-votes.repository';
import { RankVotesRepository } from './rank-votes.repository';
import { AccountsCurrentRepository } from './accounts-current.repository';
import { ObjectAuthorityRepository } from './object-authority.repository';
import { AggregatedObjectRepository } from './aggregated-object.repository';
import { PostsRepository } from './posts.repository';
import { UserPostDraftsRepository } from './user-post-drafts.repository';
import { UserAccountMutesRepository } from './user-account-mutes.repository';
import { ThreadsRepository } from './threads.repository';
import { ObjectCategoriesRelatedRepository } from './object-categories-related.repository';
import { ObjectCategoriesRepository } from './object-categories.repository';
import { UserMetadataRepository } from './user-metadata.repository';
import { UserShopDeselectRepository } from './user-shop-deselect.repository';
import { UserSubscriptionsRepository } from './user-subscriptions.repository';
import { UserObjectFollowsRepository } from './user-object-follows.repository';
import { UpdatesFeedRepository } from './updates-feed.repository';
import { SearchRepository } from './search.repository';
import { DiscoverRepository } from './discover.repository';

@Module({
  providers: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
    ObjectAuthorityRepository,
    AggregatedObjectRepository,
    PostsRepository,
    UserPostDraftsRepository,
    UserAccountMutesRepository,
    ThreadsRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRepository,
    UserMetadataRepository,
    UserShopDeselectRepository,
    UserSubscriptionsRepository,
    UserObjectFollowsRepository,
    UpdatesFeedRepository,
    SearchRepository,
    DiscoverRepository,
  ],
  exports: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
    ObjectAuthorityRepository,
    AggregatedObjectRepository,
    PostsRepository,
    UserPostDraftsRepository,
    UserAccountMutesRepository,
    ThreadsRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRepository,
    UserMetadataRepository,
    UserShopDeselectRepository,
    UserSubscriptionsRepository,
    UserObjectFollowsRepository,
    UpdatesFeedRepository,
    SearchRepository,
    DiscoverRepository,
  ],
})
export class RepositoriesModule {}
