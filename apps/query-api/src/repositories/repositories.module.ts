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
  ],
})
export class RepositoriesModule {}
