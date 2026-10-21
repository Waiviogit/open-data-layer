import { z } from 'zod';

import { FEED_TABS } from '../../domain/feed-tab';

import { postRewardSchema } from './post-reward.dto';

/** Query-api computed merchant affiliate URL on a projected object / ref. */
export const affiliateLinkViewSchema = z.object({
  link: z.string(),
  image: z.string(),
  affiliateCode: z.string().optional(),
  type: z.string(),
  objectId: z.string().optional(),
});

export type AffiliateLinkView = z.infer<typeof affiliateLinkViewSchema>;

/** Matches query-api `ProjectedObject` JSON shape. */
export const projectedObjectViewSchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  semantic_type: z.string().nullable(),
  status: z.string().optional(),
  weight: z.number().nullable().optional(),
  fields: z.record(z.string(), z.unknown()),
  isFavorited: z.boolean().optional().default(false),
  hasSupervisedOwnership: z.boolean().optional().default(false),
  hasExclusiveOwnership: z.boolean().optional().default(false),
  seo: z.record(z.string(), z.unknown()).optional(),
  affiliateLinks: z.array(affiliateLinkViewSchema).optional(),
  previewGallery: z
    .array(
      z.object({
        url: z.string(),
        cid: z.string().optional(),
        rankScore: z.number().nullable(),
        viewerRank: z.number().nullable().optional(),
        isAvatar: z.boolean(),
        update_id: z.string().optional(),
      }),
    )
    .optional(),
  galleryAlbums: z
    .array(
      z.object({
        name: z.string(),
        items: z.array(
          z.object({
            url: z.string(),
            cid: z.string().optional(),
            rankScore: z.number().nullable(),
            viewerRank: z.number().nullable().optional(),
            isAvatar: z.boolean(),
            update_id: z.string().optional(),
          }),
        ),
      }),
    )
    .optional(),
});

const feedVoteSummarySchema = z.object({
  totalCount: z.number(),
  previewVoters: z.array(z.string()),
  voted: z.boolean().optional().default(false),
});

export const feedStoryViewSchema = z.object({
  id: z.string().min(1),
  authorName: z.string().min(1),
  /** Hive post permlink (chain id segment). */
  permlink: z.string().min(1),
  authorDisplayName: z.string().optional(),
  /** Optional explicit avatar URL from API; when absent, UI falls back to Hive default by author name. */
  authorAvatarUrl: z.string().nullable().optional(),
  /** Author `object_reputation` — used for discussion sort, not display expertise. */
  authorReputation: z.number().optional(),
  /** Author Waivio expertise (`wobjects_weight`). */
  authorWobjectsWeight: z.number().optional(),
  /** First image URL from post metadata or body (feed preview). */
  thumbnailUrl: z.string().nullable().optional(),
  /** Video poster URL when post embeds video (metadata or body); UI prefers this over thumbnailUrl. */
  videoThumbnailUrl: z.string().nullable().optional(),
  /** HTTPS iframe URL for inline playback when the API can derive an embed. */
  videoEmbedUrl: z.string().nullable().optional(),
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
  rebloggedByViewer: z.boolean().optional().default(false),
  children: z.number().optional(),
  pendingPayout: z.string().optional(),
  totalPayout: z.string().optional(),
  netRshares: z.string().optional(),
  objects: z.array(projectedObjectViewSchema).optional(),
  votes: feedVoteSummarySchema.optional(),
  reward: postRewardSchema.nullable().optional(),
  waivRewardEligible: z.boolean().optional().default(false),
  pin: z.boolean().optional(),
  hasPinUpdate: z.boolean().optional(),
  hasRemoveUpdate: z.boolean().optional(),
});

export type FeedStoryView = z.infer<typeof feedStoryViewSchema>;

export const feedTabSchema = z.enum(FEED_TABS);
