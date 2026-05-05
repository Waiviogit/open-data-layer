'use server';

import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import type {
  PaginatedFollowingObjectsView,
  PaginatedUserFollowListView,
  UserObjectListSort,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { USER_SOCIAL_PAGE_SIZE } from '@/modules/user-social/constants';
import { getUserFollowersPageQuery } from '@/modules/user-social/application/queries/get-user-followers-page.query';
import { getUserFollowingPageQuery } from '@/modules/user-social/application/queries/get-user-following-page.query';
import { getUserFollowingObjectsPageQuery } from '@/modules/user-social/application/queries/get-user-following-objects-page.query';

export async function loadMoreUserFollowersAction(
  profileAccountName: string,
  sort: UserSubscriptionSort,
  skip: number,
): Promise<PaginatedUserFollowListView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getUserFollowersPageQuery(
    profileAccountName,
    { sort, skip, limit: USER_SOCIAL_PAGE_SIZE },
    user?.username ?? null,
  );
}

export async function loadMoreUserFollowingAction(
  profileAccountName: string,
  sort: UserSubscriptionSort,
  skip: number,
): Promise<PaginatedUserFollowListView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getUserFollowingPageQuery(
    profileAccountName,
    { sort, skip, limit: USER_SOCIAL_PAGE_SIZE },
    user?.username ?? null,
  );
}

export async function loadMoreUserFollowingObjectsAction(
  profileAccountName: string,
  sort: UserObjectListSort,
  locale: string,
  skip: number,
): Promise<PaginatedFollowingObjectsView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getUserFollowingObjectsPageQuery(
    profileAccountName,
    { sort, skip, limit: USER_SOCIAL_PAGE_SIZE },
    locale,
    user?.username ?? null,
  );
}
