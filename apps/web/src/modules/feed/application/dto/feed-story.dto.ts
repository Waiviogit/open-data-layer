import { z } from 'zod';

import { FEED_TABS } from '../../domain/feed-tab';

export const feedStoryViewSchema = z.object({
  id: z.string().min(1),
  authorName: z.string().min(1),
  authorDisplayName: z.string().optional(),
  /** Optional explicit avatar URL from API; when absent, UI falls back to Hive default by author name. */
  authorAvatarUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  title: z.string().optional(),
  excerpt: z.string(),
  isNsfw: z.boolean().optional(),
  permalinkPath: z.string().optional(),
});

export type FeedStoryView = z.infer<typeof feedStoryViewSchema>;

export const feedTabSchema = z.enum(FEED_TABS);
