import {
  mapFeedStoryItemApiToView,
  userBlogFeedResponseSchema,
} from '../mappers/feed-story-from-api.mapper';
import type { UserBlogFeedPage } from '../dto/user-blog-feed-page.dto';
import { fetchUserMentionsFeed } from '../../infrastructure/clients/mentions-feed.client';

export async function getUserMentionsFeedPageQuery(
  accountName: string,
  body: { limit?: number; cursor?: string } = {},
  viewer?: string | null,
): Promise<UserBlogFeedPage> {
  const raw = await fetchUserMentionsFeed(accountName, body, { viewer });
  if (!raw) {
    return { items: [], cursor: null, hasMore: false };
  }
  const parsed = userBlogFeedResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getUserMentionsFeedPageQuery] unexpected response shape:',
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
