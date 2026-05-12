import { FeedListSkeleton } from '@/modules/feed';
import { FeedColumn } from '@/shared/presentation/layout';

export default function ProfileMentionsFeedLoading() {
  return (
    <div aria-busy="true" aria-label="Loading mentions">
      <FeedColumn>
        <FeedListSkeleton />
      </FeedColumn>
    </div>
  );
}
