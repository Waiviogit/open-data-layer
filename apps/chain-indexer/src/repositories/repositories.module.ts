import { Module } from '@nestjs/common';
import { ObjectsCoreRepository } from './objects-core.repository';
import { ObjectUpdatesRepository } from './object-updates.repository';
import { ValidityVotesRepository } from './validity-votes.repository';
import { RankVotesRepository } from './rank-votes.repository';
import { AccountsCurrentRepository } from './accounts-current.repository';
import { ObjectAuthorityRepository } from './object-authority.repository';
import { AggregatedObjectRepository } from './aggregated-object.repository';
import { PostsRepository } from './posts.repository';
import { SocialGraphRepository } from './social-graph.repository';
import { ThreadsRepository } from './threads.repository';
import { PostSyncQueueRepository } from './post-sync-queue.repository';
import { AccountSyncQueueRepository } from './account-sync-queue.repository';
import { CanonicalRecomputeRepository } from './canonical-recompute.repository';
import { SiteRegistryRepository } from './site-registry.repository';
import { ObjectCategoriesRepository } from './object-categories.repository';
import { ObjectCategoriesSyncQueueRepository } from './object-categories-sync-queue.repository';
import { ObjectCategoriesRelatedRepository } from './object-categories-related.repository';
import { ObjectCategoriesRelatedSyncQueueRepository } from './object-categories-related-sync-queue.repository';
import { UserMetadataRepository } from './user-metadata.repository';
import { UserShopDeselectRepository } from './user-shop-deselect.repository';

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
    SocialGraphRepository,
    ThreadsRepository,
    PostSyncQueueRepository,
    AccountSyncQueueRepository,
    CanonicalRecomputeRepository,
    SiteRegistryRepository,
    ObjectCategoriesRepository,
    ObjectCategoriesSyncQueueRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRelatedSyncQueueRepository,
    UserMetadataRepository,
    UserShopDeselectRepository,
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
    SocialGraphRepository,
    ThreadsRepository,
    PostSyncQueueRepository,
    AccountSyncQueueRepository,
    CanonicalRecomputeRepository,
    SiteRegistryRepository,
    ObjectCategoriesRepository,
    ObjectCategoriesSyncQueueRepository,
    ObjectCategoriesRelatedRepository,
    ObjectCategoriesRelatedSyncQueueRepository,
    UserMetadataRepository,
    UserShopDeselectRepository,
  ],
})
export class RepositoriesModule {}
