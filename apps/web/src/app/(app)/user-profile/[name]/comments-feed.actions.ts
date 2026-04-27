'use server';

import type { UserBlogFeedPage } from '@/modules/feed/application/dto/user-blog-feed-page.dto';
import { getUserCommentsFeedPageQuery } from '@/modules/feed/application/queries/get-user-comments-feed.query';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreUserCommentsFeedAction(
  accountName: string,
  cursor: string,
): Promise<UserBlogFeedPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;
  return getUserCommentsFeedPageQuery(
    accountName,
    { cursor, limit: 20, sort: 'latest' },
    viewer,
  );
}
