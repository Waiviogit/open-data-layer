import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { AffiliateModule } from '../affiliate';
import { GovernanceModule } from '../governance';
import { ObjectProjectionModule } from '../object-projection/object-projection.module';
import { RepositoriesModule } from '../../repositories';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';
import { GetNestedObjectsEndpoint } from './get-nested-objects.endpoint';
import { GetObjectFollowersEndpoint } from './get-object-followers.endpoint';
import { GetObjectExpertsEndpoint } from './get-object-experts.endpoint';
import { GetObjectFavoritedByEndpoint } from './get-object-favorited-by.endpoint';
import { GetObjectOwnershipEndpoint } from './get-object-ownership.endpoint';
import { GetObjectRefListEndpoint } from './get-object-ref-list.endpoint';
import {
  GetObjectFieldReferencesByTypeEndpoint,
  GetObjectFieldReferencesSummaryEndpoint,
} from './get-object-field-references.endpoint';
import {
  GetObjectRelatedAlbumEndpoint,
  GetObjectRelatedAlbumPreviewEndpoint,
  ObjectRelatedAlbumQuerySupport,
} from './get-object-related-album.endpoint';
import { CheckObjectExistsEndpoint } from './check-object-exists.endpoint';
import { GetObjectOptionsEndpoint } from './get-object-options.endpoint';

@Module({
  imports: [
    RepositoriesModule,
    ObjectsDomainModule,
    GovernanceModule,
    ObjectProjectionModule,
    AffiliateModule,
  ],
  providers: [
    GetObjectByIdEndpoint,
    GetNestedObjectsEndpoint,
    GetObjectFollowersEndpoint,
    GetObjectExpertsEndpoint,
    GetObjectFavoritedByEndpoint,
    GetObjectOwnershipEndpoint,
    GetObjectRefListEndpoint,
    GetObjectFieldReferencesSummaryEndpoint,
    GetObjectFieldReferencesByTypeEndpoint,
    ObjectRelatedAlbumQuerySupport,
    GetObjectRelatedAlbumPreviewEndpoint,
    GetObjectRelatedAlbumEndpoint,
    CheckObjectExistsEndpoint,
    GetObjectOptionsEndpoint,
  ],
  exports: [
    GetObjectByIdEndpoint,
    GetNestedObjectsEndpoint,
    GetObjectFollowersEndpoint,
    GetObjectExpertsEndpoint,
    GetObjectFavoritedByEndpoint,
    GetObjectOwnershipEndpoint,
    GetObjectRefListEndpoint,
    GetObjectFieldReferencesSummaryEndpoint,
    GetObjectFieldReferencesByTypeEndpoint,
    ObjectRelatedAlbumQuerySupport,
    GetObjectRelatedAlbumPreviewEndpoint,
    GetObjectRelatedAlbumEndpoint,
    CheckObjectExistsEndpoint,
    GetObjectOptionsEndpoint,
  ],
})
export class ObjectsModule {}
