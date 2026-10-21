import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { AffiliateModule } from '../affiliate';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetUserFavoritesEndpoint } from './get-user-favorites.endpoint';
import { GetUserFavoritesTypesEndpoint } from './get-user-favorites-types.endpoint';
import { PostUserFavoritesMapEndpoint } from './post-user-favorites-map.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, ObjectProjectionModule, AffiliateModule],
  providers: [
    GetUserFavoritesTypesEndpoint,
    GetUserFavoritesEndpoint,
    PostUserFavoritesMapEndpoint,
  ],
  exports: [
    GetUserFavoritesTypesEndpoint,
    GetUserFavoritesEndpoint,
    PostUserFavoritesMapEndpoint,
  ],
})
export class FavoritesModule {}
