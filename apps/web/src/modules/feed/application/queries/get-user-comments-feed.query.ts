import {
  mapFeedStoryItemApiToView,
  userBlogFeedResponseSchema,
} from '../mappers/feed-story-from-api.mapper';
import type { UserBlogFeedPage } from '../dto/user-blog-feed-page.dto';
import { fetchUserCommentsFeed } from '../../infrastructure/clients/comments-feed.client';

export async function getUserCommentsFeedPageQuery(
  accountName: string,
  body: { limit?: number; cursor?: string; sort?: 'latest' | 'oldest' } = {},
  viewer?: string | null,
): Promise<UserBlogFeedPage> {
  const raw = await fetchUserCommentsFeed(accountName, body, { viewer });
  if (!raw) {
    return { items: [], cursor: null, hasMore: false };
  }
  const parsed = userBlogFeedResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getUserCommentsFeedPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return { items: [], cursor: null, hasMore: false };
  }
  return {
    items: parsed.data.items.map(mapFeedStoryItemApiToView),
    cursor: parsed.data.cursor,
    hasMore: parsed.data.hasMore,
  };
}
