import { Suspense } from 'react';

import {
  getUserAuthorityGranteesPageQuery,
  getUserAuthorityGrantorsPageQuery,
  parsePermissionsSortParam,
  parsePermissionsTabParam,
  parsePermissionsTypeParam,
  USER_PERMISSIONS_PAGE_SIZE,
  UserPermissionsList,
  loadMoreUserPermissionsAction,
} from '@/modules/user-permissions';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { revalidateUserPermissionsAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

export default async function UserProfilePermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const decoded = decodeURIComponent(name);
  const tab = parsePermissionsTabParam(sp.tab);
  const typeFilter = parsePermissionsTypeParam(sp.type);
  const sort = parsePermissionsSortParam(sp.sort);

  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;

  const query = {
    type: typeFilter,
    sort,
    skip: 0,
    limit: USER_PERMISSIONS_PAGE_SIZE,
  };

  const initial =
    tab === 'received'
      ? await getUserAuthorityGrantorsPageQuery(decoded, query)
      : await getUserAuthorityGranteesPageQuery(decoded, query);

  const listKey = `${tab}:${typeFilter ?? 'all'}:${sort}`;

  return (
    <div className="min-w-0 pb-section-y">
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-card bg-surface/80" aria-hidden />
        }
      >
        <UserPermissionsList
          key={listKey}
          profileAccountName={decoded}
          tab={tab}
          initialPage={initial}
          sort={sort}
          typeFilter={typeFilter}
          viewerUsername={viewer}
          loadMoreAction={loadMoreUserPermissionsAction}
          onBroadcastRevalidate={revalidateUserPermissionsAfterBroadcast}
        />
      </Suspense>
    </div>
  );
}
