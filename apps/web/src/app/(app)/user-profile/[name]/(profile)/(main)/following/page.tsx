import { Suspense } from 'react';

import {
  getUserFollowingPageQuery,
  parseSubscriptionSortParam,
  UserSocialAccountList,
  USER_SOCIAL_PAGE_SIZE,
} from '@/modules/user-social';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { loadMoreUserFollowingAction } from '../../../user-profile-social.actions';

export default async function UserProfileFollowingPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const decoded = decodeURIComponent(name);
  const sort = parseSubscriptionSortParam(sp.sort);

  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;

  const initial = await getUserFollowingPageQuery(
    decoded,
    { sort, skip: 0, limit: USER_SOCIAL_PAGE_SIZE },
    viewer,
  );

  return (
    <div className="mx-auto max-w-container-content pb-section-y">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface/80" aria-hidden />}>
        <UserSocialAccountList
          key={sort}
          profileAccountName={decoded}
          listKind="following"
          initialPage={initial}
          sort={sort}
          currentUsername={viewer}
          loadMoreAction={loadMoreUserFollowingAction}
        />
      </Suspense>
    </div>
  );
}
