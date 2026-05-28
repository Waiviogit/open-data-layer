import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { RepositoriesModule } from '../../repositories';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';
import { GetNestedObjectsEndpoint } from './get-nested-objects.endpoint';
import { GetObjectFollowersEndpoint } from './get-object-followers.endpoint';
import { GetObjectAuthorityEndpoint } from './get-object-authority.endpoint';
import { GetObjectRefListEndpoint } from './get-object-ref-list.endpoint';
import { CheckObjectExistsEndpoint } from './check-object-exists.endpoint';

@Module({
  imports: [
    RepositoriesModule,
    ObjectsDomainModule,
    GovernanceModule,
    ObjectProjectionModule,
  ],
  providers: [
    GetObjectByIdEndpoint,
    GetNestedObjectsEndpoint,
    GetObjectFollowersEndpoint,
    GetObjectAuthorityEndpoint,
    GetObjectRefListEndpoint,
    CheckObjectExistsEndpoint,
  ],
  exports: [
    GetObjectByIdEndpoint,
    GetNestedObjectsEndpoint,
    GetObjectFollowersEndpoint,
    GetObjectAuthorityEndpoint,
    GetObjectRefListEndpoint,
    CheckObjectExistsEndpoint,
  ],
})
export class ObjectsModule {}
