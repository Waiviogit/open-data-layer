import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { AffiliateModule } from '../affiliate';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { GetUserCategoriesEndpoint } from './get-user-categories.endpoint';
import { GetCategoryObjectsEndpoint } from './get-category-objects.endpoint';

@Module({
  imports: [
    RepositoriesModule,
    ObjectsDomainModule,
    GovernanceModule,
    ObjectProjectionModule,
    AffiliateModule,
  ],
  providers: [GetUserCategoriesEndpoint, GetCategoryObjectsEndpoint],
  exports: [GetUserCategoriesEndpoint, GetCategoryObjectsEndpoint],
})
export class CategoriesModule {}
