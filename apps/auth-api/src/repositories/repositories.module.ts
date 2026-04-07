import { Module } from '@nestjs/common';
import { ChallengesRepository } from './challenges.repository';
import { IdentitiesRepository } from './identities.repository';
import { RefreshSessionsRepository } from './refresh-sessions.repository';

@Module({
  providers: [ChallengesRepository, IdentitiesRepository, RefreshSessionsRepository],
  exports: [ChallengesRepository, IdentitiesRepository, RefreshSessionsRepository],
})
export class RepositoriesModule {}
