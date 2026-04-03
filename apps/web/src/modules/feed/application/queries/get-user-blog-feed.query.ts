import {
  mapFeedStoryItemApiToView,
  userBlogFeedResponseSchema,
} from '../mappers/feed-story-from-api.mapper';
import type { UserBlogFeedPage } from '../dto/user-blog-feed-page.dto';
import { fetchUserBlogFeed } from '../../infrastructure/clients/blog-feed.client';

export async function getUserBlogFeedPageQuery(
  accountName: string,
  body: { limit?: number; cursor?: string } = {},
): Promise<UserBlogFeedPage> {
  const raw = await fetchUserBlogFeed(accountName, body);
  if (!raw) {
    return { items: [], cursor: null, hasMore: false };
  }
  const parsed = userBlogFeedResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid user blog feed response: ${parsed.error.flatten().toString()}`,
    );
  }
  return {
    items: parsed.data.items.map(mapFeedStoryItemApiToView),
    cursor: parsed.data.cursor,
    hasMore: parsed.data.hasMore,
  };
}
