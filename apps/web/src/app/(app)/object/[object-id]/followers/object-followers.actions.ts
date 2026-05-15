'use server';

import { getObjectFollowersPageQuery } from '@/modules/object/application/queries/get-object-followers-page.query';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { USER_SOCIAL_PAGE_SIZE } from '@/modules/user-social/constants';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreObjectFollowersAction(
  objectId: string,
  sort: UserSubscriptionSort,
  skip: number,
): Promise<PaginatedUserFollowListView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getObjectFollowersPageQuery(
    objectId,
    { sort, skip, limit: USER_SOCIAL_PAGE_SIZE },
    user?.username ?? null,
  );
}
