import { getObjectPostsFeedPageQuery } from '@/modules/feed';
import { MOBILE_REVIEWS_PREVIEW_FETCH_LIMIT } from '@/modules/object/infrastructure/clients/object-social.client';
import { ObjectRightReviewsSection } from '@/modules/object/presentation/components/object-right-reviews-section';

export type ObjectPageMobileSocialSectionProps = {
  objectId: string;
  viewerUsername: string | null;
};

/** Reviews preview for standard-object mobile Details landing. */
export async function ObjectPageMobileSocialSection({
  objectId,
  viewerUsername,
}: ObjectPageMobileSocialSectionProps) {
  const reviewsPage = await getObjectPostsFeedPageQuery(
    objectId,
    { limit: MOBILE_REVIEWS_PREVIEW_FETCH_LIMIT },
    viewerUsername,
  );

  if (reviewsPage.items.length === 0) {
    return null;
  }

  return (
    <ObjectRightReviewsSection
      objectId={objectId}
      page={reviewsPage}
      currentUsername={viewerUsername}
    />
  );
}
