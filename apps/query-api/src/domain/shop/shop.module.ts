import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetUserShopObjectsEndpoint } from './get-user-shop-objects.endpoint';
import { GetUserShopSectionsEndpoint } from './get-user-shop-sections.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, ObjectProjectionModule],
  providers: [GetUserShopObjectsEndpoint, GetUserShopSectionsEndpoint],
  exports: [GetUserShopObjectsEndpoint, GetUserShopSectionsEndpoint],
})
export class ShopModule {}
