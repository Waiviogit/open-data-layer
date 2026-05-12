import { FeedListSkeleton } from '@/modules/feed';
import { FeedColumn } from '@/shared/presentation/layout';

export default function ProfileCommentsFeedLoading() {
  return (
    <div aria-busy="true" aria-label="Loading comments">
      <FeedColumn>
        <FeedListSkeleton />
      </FeedColumn>
    </div>
  );
}
