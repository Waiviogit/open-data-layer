'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { CryptoMarketPanel } from '@/modules/currency/presentation/components/crypto-market-panel';
import { ClaimRewardsSidebarCard } from '@/modules/user-wallet/presentation/components/wallet/claim-rewards-sidebar-card';
import { ActivityFiltersFromUrl } from '@/modules/user-activity/presentation/components/activity-filters';
import { isUserProfileActivityTab } from '@/modules/user-activity/domain/activity-filters-url';
import { MessagingProfileAboutRail } from '@/modules/messaging/presentation/messaging-profile-about-rail';
import { isUserProfileWalletSection } from '../../domain/profile-transfers-url';
import { PROFILE_FILTER_RAIL_STICKY_CLASS } from '@/shared/presentation/layout';
import { isUserProfileMessagesTab } from './profile-path';
import { isUserProfilePostsTab } from '../../domain/profile-post-filters-url';
import { isUserProfileShopOrRecipeTab } from '../../domain/profile-shop-filters-url';
import { ProfilePostFiltersFromUrl } from './profile-post-filters';
import { ProfileShopFiltersFromUrl } from './profile-shop-filters';
import {
  WalletActionsSidebarBottom,
  WalletActionsSidebarTop,
} from './wallet-actions-sidebar';

type RightSidebarProps = {
  accountName: string;
  viewerUsername?: string | null;
};

function FiltersFallback() {
  return (
    <aside
      className={[
        PROFILE_FILTER_RAIL_STICKY_CLASS,
        'rounded-card border border-border bg-surface/60 p-card-padding',
      ].join(' ')}
      aria-hidden
    >
      <div className="h-6 w-32 animate-pulse rounded-btn bg-surface-control" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded-btn bg-surface-control" />
        ))}
      </div>
    </aside>
  );
}

function RightSidebarContent({ accountName, viewerUsername }: RightSidebarProps) {
  const pathname = usePathname();

  if (isUserProfileMessagesTab(pathname)) {
    return (
      <Suspense fallback={<FiltersFallback />}>
        <MessagingProfileAboutRail
          accountName={accountName}
          viewerUsername={viewerUsername ?? null}
        />
      </Suspense>
    );
  }

  if (isUserProfilePostsTab(pathname)) {
    return (
      <Suspense fallback={<FiltersFallback />}>
        <ProfilePostFiltersFromUrl accountName={accountName} />
      </Suspense>
    );
  }

  if (isUserProfileShopOrRecipeTab(pathname)) {
    return (
      <Suspense fallback={<FiltersFallback />}>
        <ProfileShopFiltersFromUrl accountName={accountName} />
      </Suspense>
    );
  }

  if (isUserProfileActivityTab(pathname)) {
    return (
      <Suspense fallback={<FiltersFallback />}>
        <ActivityFiltersFromUrl accountName={accountName} />
      </Suspense>
    );
  }

  if (isUserProfileWalletSection(pathname)) {
    return (
      <aside
        className={[
          PROFILE_FILTER_RAIL_STICKY_CLASS,
          'min-w-0 space-y-card-padding overflow-x-hidden',
        ].join(' ')}
      >
        <WalletActionsSidebarTop
          accountName={accountName}
          viewerUsername={viewerUsername ?? null}
        />
        <CryptoMarketPanel />
        <ClaimRewardsSidebarCard
          accountName={accountName}
          viewerUsername={viewerUsername ?? null}
        />
        <WalletActionsSidebarBottom
          accountName={accountName}
          viewerUsername={viewerUsername ?? null}
        />
      </aside>
    );
  }

  return null;
}

export function RightSidebar({
  accountName,
  viewerUsername = null,
}: RightSidebarProps) {
  return (
    <RightSidebarContent
      accountName={accountName}
      viewerUsername={viewerUsername}
    />
  );
}
