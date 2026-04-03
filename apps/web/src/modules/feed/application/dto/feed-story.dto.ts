import { z } from 'zod';

import { FEED_TABS } from '../../domain/feed-tab';

const feedObjectChipSchema = z.object({
  objectId: z.string(),
  objectType: z.string().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const feedVoteSummarySchema = z.object({
  totalCount: z.number(),
  previewVoters: z.array(z.string()),
});

export const feedStoryViewSchema = z.object({
  id: z.string().min(1),
  authorName: z.string().min(1),
  authorDisplayName: z.string().optional(),
  /** Optional explicit avatar URL from API; when absent, UI falls back to Hive default by author name. */
  authorAvatarUrl: z.string().nullable().optional(),
  /** Author reputation score (e.g. Hive reputation). */
  authorReputation: z.number().optional(),
  /** First image URL from post metadata or body (feed preview). */
  thumbnailUrl: z.string().nullable().optional(),
  /** Primary sort/display time for the feed row (original post or reblog time). */
  createdAt: z.string().datetime({ offset: true }),
  feedAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().optional(),
  excerpt: z.string(),
  isNsfw: z.boolean().optional(),
  /** Hive post category (e.g. tag). */
  category: z.string().nullable().optional(),
  permalinkPath: z.string().optional(),
  rebloggedBy: z.string().nullable().optional(),
  children: z.number().optional(),
  pendingPayout: z.string().optional(),
  totalPayout: z.string().optional(),
  netRshares: z.string().optional(),
  objects: z.array(feedObjectChipSchema).optional(),
  votes: feedVoteSummarySchema.optional(),
});

export type FeedStoryView = z.infer<typeof feedStoryViewSchema>;

export const feedTabSchema = z.enum(FEED_TABS);
