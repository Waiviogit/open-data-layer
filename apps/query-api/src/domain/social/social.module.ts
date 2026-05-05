import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { GetUserFollowersEndpoint } from './get-user-followers.endpoint';
import { GetUserFollowingEndpoint } from './get-user-following.endpoint';
import { GetUserFollowingObjectsEndpoint } from './get-user-following-objects.endpoint';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule, ObjectProjectionModule],
  providers: [
    GetUserFollowersEndpoint,
    GetUserFollowingEndpoint,
    GetUserFollowingObjectsEndpoint,
  ],
  exports: [
    GetUserFollowersEndpoint,
    GetUserFollowingEndpoint,
    GetUserFollowingObjectsEndpoint,
  ],
})
export class SocialModule {}
