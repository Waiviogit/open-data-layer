'use server';

import type { UserBlogFeedPage } from '@/modules/feed/application/dto/user-blog-feed-page.dto';
import { getUserBlogFeedPageQuery } from '@/modules/feed/application/queries/get-user-blog-feed.query';

export async function loadMoreUserBlogFeedAction(
  accountName: string,
  cursor: string,
): Promise<UserBlogFeedPage> {
  return getUserBlogFeedPageQuery(accountName, { cursor, limit: 20 });
}
