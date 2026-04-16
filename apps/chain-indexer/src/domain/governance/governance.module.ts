import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { GovernanceCacheService } from './governance-cache.service';
import { GovernanceResolverService } from './governance-resolver.service';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule],
  providers: [GovernanceResolverService, GovernanceCacheService],
  exports: [GovernanceResolverService, GovernanceCacheService],
})
export class GovernanceModule {}
