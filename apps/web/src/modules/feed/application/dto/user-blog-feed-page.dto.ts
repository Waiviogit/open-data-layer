import type { FeedStoryView } from './feed-story.dto';

export type UserBlogFeedPage = {
  items: FeedStoryView[];
  cursor: string | null;
  hasMore: boolean;
};
