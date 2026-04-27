'use server';

import type { UserBlogFeedPage } from '@/modules/feed/application/dto/user-blog-feed-page.dto';
import { getUserMentionsFeedPageQuery } from '@/modules/feed/application/queries/get-user-mentions-feed.query';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreUserMentionsFeedAction(
  accountName: string,
  cursor: string,
): Promise<UserBlogFeedPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username ?? null;
  return getUserMentionsFeedPageQuery(accountName, { cursor, limit: 20 }, viewer);
}
