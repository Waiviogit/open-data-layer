import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { GovernanceModule } from '../governance/governance.module';
import { AccountPostingCacheService } from './account-posting-cache.service';
import { SiteCanonicalService } from './site-canonical.service';
import { SiteCanonicalRecomputeListener } from './site-canonical-recompute.listener';
import { SiteCanonicalWorker } from './site-canonical.worker';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [
    AccountPostingCacheService,
    SiteCanonicalService,
    SiteCanonicalRecomputeListener,
    SiteCanonicalWorker,
  ],
  exports: [SiteCanonicalService, AccountPostingCacheService],
})
export class SiteCanonicalModule {}
