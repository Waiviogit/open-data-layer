import { Module } from '@nestjs/common';
import { ObjectsCoreRepository } from './objects-core.repository';
import { ObjectUpdatesRepository } from './object-updates.repository';
import { ValidityVotesRepository } from './validity-votes.repository';
import { RankVotesRepository } from './rank-votes.repository';
import { AccountsCurrentRepository } from './accounts-current.repository';

@Module({
  providers: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
  ],
  exports: [
    ObjectsCoreRepository,
    ObjectUpdatesRepository,
    ValidityVotesRepository,
    RankVotesRepository,
    AccountsCurrentRepository,
  ],
})
export class RepositoriesModule {}
