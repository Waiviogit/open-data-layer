import { z } from 'zod';

import type { FeedStoryView } from '../dto/feed-story.dto';

const feedStoryItemApiSchema = z.object({
  id: z.string(),
  author: z.string(),
  permlink: z.string(),
  title: z.string(),
  excerpt: z.string(),
  createdAt: z.string(),
  feedAt: z.string(),
  rebloggedBy: z.string().nullable(),
  isNsfw: z.boolean(),
  category: z.string().nullable(),
  children: z.number(),
  pendingPayout: z.string(),
  totalPayout: z.string(),
  netRshares: z.string(),
  thumbnailUrl: z.string().nullable(),
  videoThumbnailUrl: z.string().nullable(),
  authorProfile: z.object({
    name: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    reputation: z.number(),
  }),
  objects: z.array(
    z.object({
      objectId: z.string(),
      objectType: z.string().nullable(),
      name: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    }),
  ),
  votes: z.object({
    totalCount: z.number(),
    previewVoters: z.array(z.string()),
  }),
});

export const userBlogFeedResponseSchema = z.object({
  items: z.array(feedStoryItemApiSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type FeedStoryItemApi = z.infer<typeof feedStoryItemApiSchema>;

export function mapFeedStoryItemApiToView(item: FeedStoryItemApi): FeedStoryView {
  return {
    id: item.id,
    authorName: item.author,
    authorDisplayName: item.authorProfile.displayName ?? undefined,
    authorAvatarUrl: item.authorProfile.avatarUrl ?? undefined,
    authorReputation: item.authorProfile.reputation,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    videoThumbnailUrl: item.videoThumbnailUrl ?? undefined,
    createdAt: item.createdAt,
    feedAt: item.feedAt,
    title: item.title || undefined,
    excerpt: item.excerpt,
    isNsfw: item.isNsfw,
    category: item.category,
    permalinkPath: `/@${item.author}/${item.permlink}`,
    rebloggedBy: item.rebloggedBy,
    children: item.children,
    pendingPayout: item.pendingPayout,
    totalPayout: item.totalPayout,
    netRshares: item.netRshares,
    objects: item.objects,
    votes: item.votes,
  };
}
