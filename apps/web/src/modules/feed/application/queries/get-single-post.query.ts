import { sanitizePostHtml } from '@/shared/infrastructure/sanitize-post-html';

import type { FeedStoryView } from '../dto/feed-story.dto';
import {
  mapFeedStoryItemApiToView,
  singlePostApiSchema,
} from '../mappers/feed-story-from-api.mapper';
import { fetchSinglePost } from '../../infrastructure/clients/single-post.client';

export type BlogPostPayload = {
  story: FeedStoryView;
  bodyHtmlSafe: string;
};

export async function getSinglePostQuery(
  author: string,
  permlink: string,
  locale: string,
): Promise<BlogPostPayload | null> {
  const raw = await fetchSinglePost(author, permlink, { locale });
  if (!raw) {
    return null;
  }
  const parsed = singlePostApiSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[getSinglePostQuery] unexpected response shape:', parsed.error.flatten());
    return null;
  }
  const story = mapFeedStoryItemApiToView(parsed.data);
  const bodyHtmlSafe = sanitizePostHtml(parsed.data.body);
  return { story, bodyHtmlSafe };
}
