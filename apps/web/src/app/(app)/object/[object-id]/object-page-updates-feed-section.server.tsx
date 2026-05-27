import { ObjectPageUpdatesFeedClient } from './object-page-updates-feed-client';
import { fetchEmbeddedUpdatesFeed } from './object-page-embedded-data.server';
import type { ObjectPageViewModel } from '@/modules/object';

export type ObjectPageUpdatesFeedSectionProps = {
  objectId: string;
  model: ObjectPageViewModel;
  searchParams: Record<string, string | string[] | undefined>;
  locale: string;
  viewerUsername: string | null;
};

export async function ObjectPageUpdatesFeedSection({
  objectId,
  model,
  searchParams,
  locale,
  viewerUsername,
}: ObjectPageUpdatesFeedSectionProps) {
  const embeddedUpdatesFeed = await fetchEmbeddedUpdatesFeed(objectId, model, searchParams, {
    locale,
    viewer: viewerUsername,
  });

  return (
    <ObjectPageUpdatesFeedClient
      objectId={objectId}
      embeddedUpdatesFeed={embeddedUpdatesFeed}
      viewerUsername={viewerUsername}
      tagCategoryNames={model.tagCategoryNames}
    />
  );
}
