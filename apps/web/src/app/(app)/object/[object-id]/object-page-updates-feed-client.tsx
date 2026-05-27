'use client';

import { ObjectUpdatesFeed } from '@/modules/object-updates/presentation/components/object-updates-feed';
import type { ObjectEmbeddedUpdatesFeedModel } from '@/modules/object-updates/embedded-updates-feed.model';

import { loadMoreObjectUpdatesFeedAction } from './updates/updates-feed.actions';

export type ObjectPageUpdatesFeedClientProps = {
  objectId: string;
  embeddedUpdatesFeed: ObjectEmbeddedUpdatesFeedModel;
  viewerUsername: string | null;
  tagCategoryNames: string[];
};

export function ObjectPageUpdatesFeedClient({
  objectId,
  embeddedUpdatesFeed,
  viewerUsername,
  tagCategoryNames,
}: ObjectPageUpdatesFeedClientProps) {
  const updatesFeedKey = [
    embeddedUpdatesFeed.filters.sort,
    embeddedUpdatesFeed.filters.update_type ?? '',
    embeddedUpdatesFeed.filters.locale ?? '',
  ].join('|');

  return (
    <ObjectUpdatesFeed
      key={updatesFeedKey}
      objectId={objectId}
      initialItems={embeddedUpdatesFeed.initialPage.items}
      initialCursor={embeddedUpdatesFeed.initialPage.cursor}
      initialHasMore={embeddedUpdatesFeed.initialPage.hasMore}
      filters={embeddedUpdatesFeed.filters}
      typeOptions={embeddedUpdatesFeed.typeOptions}
      showLocaleFilter={embeddedUpdatesFeed.showLocaleFilter}
      localizableTypes={embeddedUpdatesFeed.localizableTypes}
      filterSync="url"
      loadMoreAction={loadMoreObjectUpdatesFeedAction}
      viewerUsername={viewerUsername}
      tagCategoryNames={tagCategoryNames}
    />
  );
}
