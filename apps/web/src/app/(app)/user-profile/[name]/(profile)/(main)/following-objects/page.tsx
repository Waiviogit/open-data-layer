import { Suspense } from 'react';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import {
  getUserFollowingObjectsPageQuery,
  parseObjectListSortParam,
  UserSocialObjectsList,
  USER_SOCIAL_PAGE_SIZE,
} from '@/modules/user-social';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { loadMoreUserFollowingObjectsAction } from '../../../user-profile-social.actions';

export default async function UserProfileFollowingObjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const decoded = decodeURIComponent(name);
  const sort = parseObjectListSortParam(sp.sort);

  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;
  const locale = await getRequestLocale();

  const initial = await getUserFollowingObjectsPageQuery(
    decoded,
    { sort, skip: 0, limit: USER_SOCIAL_PAGE_SIZE },
    locale,
    viewer,
  );

  return (
    <div className="mx-auto max-w-container-content pb-section-y">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface/80" aria-hidden />}>
        <UserSocialObjectsList
          key={sort}
          profileAccountName={decoded}
          initialPage={initial}
          sort={sort}
          locale={locale}
          viewerUsername={viewer}
          loadMoreAction={loadMoreUserFollowingObjectsAction}
        />
      </Suspense>
    </div>
  );
}
