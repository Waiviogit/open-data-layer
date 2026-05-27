import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';

import { getObjectFollowersPageQuery } from '@/modules/object/application/queries/get-object-followers-page.query';
import { RIGHT_RAIL_FOLLOWERS_FETCH_LIMIT } from '@/modules/object/infrastructure/clients/object-social.client';
import {
  fetchObjectRefList,
  projectedObjectToRefCard,
  RIGHT_RAIL_REF_FETCH_LIMIT,
} from '@/modules/object/infrastructure/object-ref-list.client';
import { ObjectRightSidebar } from '@/modules/object/presentation/components/object-right-sidebar';

function objectTypeSupportsRefList(objectTypeKey: string, updateType: string): boolean {
  const registryEntry =
    OBJECT_TYPE_REGISTRY[objectTypeKey as keyof typeof OBJECT_TYPE_REGISTRY];
  return registryEntry?.supported_updates.includes(updateType) ?? false;
}

export type ObjectPageRightRailSectionProps = {
  objectId: string;
  objectTypeKey: string;
  locale: string;
  viewerUsername: string | null;
  followersTabCount: number;
};

export async function ObjectPageRightRailSection({
  objectId,
  objectTypeKey,
  locale,
  viewerUsername,
  followersTabCount,
}: ObjectPageRightRailSectionProps) {
  const refFetchInit = { locale, viewer: viewerUsername };
  const supportsRelated = objectTypeSupportsRefList(objectTypeKey, UPDATE_TYPES.IS_RELATED_TO);
  const supportsSimilar = objectTypeSupportsRefList(objectTypeKey, UPDATE_TYPES.IS_SIMILAR_TO);
  const supportsAddOn = objectTypeSupportsRefList(objectTypeKey, UPDATE_TYPES.ADD_ON);

  const [relatedRailPage, similarRailPage, addOnRailPage, rightRailFollowersPage] =
    await Promise.all([
      supportsRelated
        ? fetchObjectRefList(
            objectId,
            'related',
            { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
            refFetchInit,
          )
        : Promise.resolve(null),
      supportsSimilar
        ? fetchObjectRefList(
            objectId,
            'similar',
            { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
            refFetchInit,
          )
        : Promise.resolve(null),
      supportsAddOn
        ? fetchObjectRefList(
            objectId,
            'add-on',
            { limit: RIGHT_RAIL_REF_FETCH_LIMIT },
            refFetchInit,
          )
        : Promise.resolve(null),
      followersTabCount > 0
        ? getObjectFollowersPageQuery(
            objectId,
            { sort: 'rank', skip: 0, limit: RIGHT_RAIL_FOLLOWERS_FETCH_LIMIT },
            viewerUsername,
          )
        : Promise.resolve(null),
    ]);

  const rightRailFollowersPreview =
    rightRailFollowersPage != null && rightRailFollowersPage.items.length > 0
      ? rightRailFollowersPage
      : null;

  return (
    <ObjectRightSidebar
      objectId={objectId}
      related={relatedRailPage?.items.slice(0, 5).map(projectedObjectToRefCard) ?? []}
      similar={similarRailPage?.items.slice(0, 5).map(projectedObjectToRefCard) ?? []}
      addOn={addOnRailPage?.items.slice(0, 5).map(projectedObjectToRefCard) ?? []}
      relatedHasMore={relatedRailPage?.hasMore ?? false}
      similarHasMore={similarRailPage?.hasMore ?? false}
      addOnHasMore={addOnRailPage?.hasMore ?? false}
      rightRailFollowersPage={rightRailFollowersPreview}
    />
  );
}
