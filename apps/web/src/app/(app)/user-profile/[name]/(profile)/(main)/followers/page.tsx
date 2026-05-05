import {
  getUserFollowersPageQuery,
  getUserFollowingObjectsPageQuery,
  parseSubscriptionSortParam,
  USER_SOCIAL_PAGE_SIZE,
  UserSocialAccountList,
  UserSocialTabs,
} from '@/modules/user-social';
import { getUserProfileQuery } from '@/modules/user-profile';
import { Suspense } from 'react';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { loadMoreUserFollowersAction } from '../../../user-profile-social.actions';

export default async function UserProfileFollowersPage({
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
  const locale = await getRequestLocale();

  const [profile, initial, objectsHead] = await Promise.all([
    getUserProfileQuery(decoded),
    getUserFollowersPageQuery(decoded, { sort, skip: 0, limit: USER_SOCIAL_PAGE_SIZE }, viewer),
    getUserFollowingObjectsPageQuery(decoded, { sort: 'weight', skip: 0, limit: 0 }, locale, viewer),
  ]);

  return (
    <div className="mx-auto max-w-container-content pb-section-y">
      <UserSocialTabs
        accountName={decoded}
        active="followers"
        followerCount={profile?.followerCount ?? 0}
        followingCount={profile?.followingCount ?? 0}
        objectsCount={objectsHead.total}
      />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface/80" aria-hidden />}>
        <UserSocialAccountList
          key={sort}
          profileAccountName={decoded}
          listKind="followers"
          initialPage={initial}
          sort={sort}
          currentUsername={viewer}
          loadMoreAction={loadMoreUserFollowersAction}
        />
      </Suspense>
    </div>
  );
}
