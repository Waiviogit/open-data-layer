import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { GovernanceResolverService } from './governance-resolver.service';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule],
  providers: [GovernanceResolverService],
  exports: [GovernanceResolverService],
})
export class GovernanceModule {}
