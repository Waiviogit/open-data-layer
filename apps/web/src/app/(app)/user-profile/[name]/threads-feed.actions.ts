'use server';

import type { UserBlogFeedPage } from '@/modules/feed/application/dto/user-blog-feed-page.dto';
import { getUserThreadsFeedPageQuery } from '@/modules/feed/application/queries/get-user-threads-feed.query';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreUserThreadsFeedAction(
  accountName: string,
  cursor: string,
): Promise<UserBlogFeedPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;
  return getUserThreadsFeedPageQuery(
    accountName,
    { cursor, limit: 20, sort: 'latest' },
    viewer,
  );
}
