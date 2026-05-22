import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetDiscoverObjectsEndpoint } from './get-discover-objects.endpoint';
import { GetDiscoverTagCategoriesEndpoint } from './get-discover-tag-categories.endpoint';
import { GetDiscoverUsersEndpoint } from './get-discover-users.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, GovernanceModule, ObjectProjectionModule],
  providers: [
    GetDiscoverObjectsEndpoint,
    GetDiscoverUsersEndpoint,
    GetDiscoverTagCategoriesEndpoint,
  ],
  exports: [
    GetDiscoverObjectsEndpoint,
    GetDiscoverUsersEndpoint,
    GetDiscoverTagCategoriesEndpoint,
  ],
})
export class DiscoverModule {}
