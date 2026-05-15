'use server';

import { getObjectAuthorityPageQuery } from '@/modules/object/application/queries/get-object-authority-page.query';
import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';
import { USER_SOCIAL_PAGE_SIZE } from '@/modules/user-social/constants';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreObjectAuthorityAction(
  objectId: string,
  authorityType: 'administrative' | 'ownership',
  sort: UserSubscriptionSort,
  skip: number,
): Promise<PaginatedUserFollowListView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getObjectAuthorityPageQuery(
    objectId,
    { authorityType, sort, skip, limit: USER_SOCIAL_PAGE_SIZE },
    user?.username ?? null,
  );
}
