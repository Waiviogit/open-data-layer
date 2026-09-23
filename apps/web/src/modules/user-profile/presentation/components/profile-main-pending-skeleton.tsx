'use client';

import { FeedPostsLoadingSkeleton } from '@/modules/feed/presentation/components/feed-posts-loading-skeleton';
import { FeedListSkeleton } from '@/modules/feed/presentation/components/feed-skeletons';
import { TransfersWalletLoadingSkeleton } from '@/modules/user-wallet/presentation/components/wallet/transfers-wallet-loading-skeleton';
import { FeedColumn } from '@/shared/presentation/layout';

import { getSegmentsAfterAccount } from './profile-path';
import { useEffectiveProfileNav } from './user-profile-pending-nav-context';
import { getSubmenuVariant } from './user-profile-subnav';

function ProfileSocialListPendingSkeleton() {
  return (
    <div
      className="min-w-0 pb-section-y"
      aria-busy="true"
      aria-label="Loading social list"
    >
      <ul className="divide-y divide-border" role="list">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <div className="size-12 shrink-0 animate-pulse rounded-circle bg-surface-control" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 max-w-[8rem] animate-pulse rounded-btn bg-surface-control" />
              <div className="h-3 max-w-[12rem] animate-pulse rounded-btn bg-surface-control" />
            </div>
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-btn bg-surface-control" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileSectionPendingSkeleton() {
  return (
    <section
      className="rounded-card border border-border bg-surface/80 p-card-padding"
      aria-busy="true"
      aria-label="Loading section"
    >
      <div className="h-6 max-w-[12rem] animate-pulse rounded-btn bg-surface-control" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded-btn bg-surface-control" />
        <div className="h-4 max-w-[85%] animate-pulse rounded-btn bg-surface-control" />
        <div className="h-4 max-w-[70%] animate-pulse rounded-btn bg-surface-control" />
      </div>
    </section>
  );
}

function ProfileShopPendingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading shop">
      <div className="mb-card-padding flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-pill bg-surface-control"
          />
        ))}
      </div>
      <FeedColumn>
        <FeedListSkeleton count={4} />
      </FeedColumn>
    </div>
  );
}

function ProfileObjectListPendingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading objects">
      <FeedColumn>
        <FeedListSkeleton count={6} />
      </FeedColumn>
    </div>
  );
}

/** Client-safe pending overlay skeletons (no server route `loading.tsx` imports). */
export function ProfileMainPendingSkeleton() {
  const { pathname } = useEffectiveProfileNav();
  const variant = getSubmenuVariant(pathname);
  const head = getSegmentsAfterAccount(pathname)[0] ?? '';

  if (head === 'permissions') {
    return <ProfileSectionPendingSkeleton />;
  }
  if (variant === 'wallet') {
    return <TransfersWalletLoadingSkeleton />;
  }
  if (variant === 'feed') {
    return <FeedPostsLoadingSkeleton />;
  }
  if (variant === 'followers') {
    return <ProfileSocialListPendingSkeleton />;
  }
  if (variant === 'expertise') {
    return <ProfileSectionPendingSkeleton />;
  }

  if (head === 'user-shop' || head === 'recipe') {
    return <ProfileShopPendingSkeleton />;
  }
  if (head === 'favorites') {
    return <ProfileObjectListPendingSkeleton />;
  }

  return <FeedPostsLoadingSkeleton />;
}
