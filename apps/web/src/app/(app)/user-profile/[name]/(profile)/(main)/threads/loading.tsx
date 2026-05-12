import { FeedListSkeleton } from '@/modules/feed';
import { FeedColumn } from '@/shared/presentation/layout';

export default function ProfileThreadsFeedLoading() {
  return (
    <div aria-busy="true" aria-label="Loading threads">
      <FeedColumn>
        <FeedListSkeleton />
      </FeedColumn>
    </div>
  );
}
