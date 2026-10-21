import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { AffiliateModule } from '../affiliate';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetUserShopFiltersEndpoint } from './get-user-shop-filters.endpoint';
import { GetUserShopObjectsEndpoint } from './get-user-shop-objects.endpoint';
import { GetUserShopSectionsEndpoint } from './get-user-shop-sections.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, ObjectProjectionModule, AffiliateModule],
  providers: [
    GetUserShopObjectsEndpoint,
    GetUserShopSectionsEndpoint,
    GetUserShopFiltersEndpoint,
  ],
  exports: [
    GetUserShopObjectsEndpoint,
    GetUserShopSectionsEndpoint,
    GetUserShopFiltersEndpoint,
  ],
})
export class ShopModule {}
