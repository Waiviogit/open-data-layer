import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetSearchCountsEndpoint } from './get-search-counts.endpoint';
import { GetSearchEndpoint } from './get-search.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule, ObjectProjectionModule],
  providers: [GetSearchEndpoint, GetSearchCountsEndpoint],
  exports: [GetSearchEndpoint, GetSearchCountsEndpoint],
})
export class SearchModule {}
