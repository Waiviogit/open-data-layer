'use client';

import { FeedColumn } from '@/shared/presentation/layout';
import { shouldUsePostGrid, useShellMode } from '@/shell-mode';

import { FeedListSkeleton, FeedPostGridSkeleton } from './feed-skeletons';

/**
 * Profile **posts** tab: list vs Instagram grid matches {@link BlogFeedPostsList} shell rules.
 */
export function FeedPostsLoadingSkeleton() {
  const { resolvedMode } = useShellMode();
  const useGrid = shouldUsePostGrid(resolvedMode);

  return (
    <div aria-busy="true" aria-label="Loading posts">
      <FeedColumn>
        {useGrid ? <FeedPostGridSkeleton /> : <FeedListSkeleton />}
      </FeedColumn>
    </div>
  );
}
