import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { GovernanceModule } from '../governance';
import { AffiliateCodesService } from './affiliate-codes.service';
import { AffiliateLinksEnricher } from './affiliate-links.enricher';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule],
  providers: [AffiliateCodesService, AffiliateLinksEnricher],
  exports: [AffiliateLinksEnricher],
})
export class AffiliateModule {}
