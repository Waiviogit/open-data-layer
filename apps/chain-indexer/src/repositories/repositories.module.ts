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
  ],
})
export class RepositoriesModule {}
