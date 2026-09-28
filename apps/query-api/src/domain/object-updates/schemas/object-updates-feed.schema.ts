import { z } from 'zod';

export const objectUpdatesFeedQuerySchema = z.object({
  cursor: z.string().optional().describe('Opaque pagination cursor'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Page size'),
  update_type: z
    .string()
    .min(1)
    .optional()
    .describe('Filter to a single update type id'),
  locale: z
    .string()
    .min(1)
    .optional()
    .describe('Locale filter for update rows (in addition to MCP locale)'),
  sort: z
    .enum(['recency', 'approval'])
    .default('recency')
    .describe('Sort by recency or approval percent'),
});

export type ObjectUpdatesFeedQuery = z.infer<typeof objectUpdatesFeedQuerySchema>;

export type DecisivePrivilegedVoteDto = {
  tier: 'admin' | 'trusted';
  vote: 'for' | 'against';
  voter: string;
};

export type ObjectUpdateFeedItemDto = {
  update_id: string;
  object_id: string;
  update_type: string;
  creator: string;
  creator_wobjects_weight: number;
  locale: string | null;
  created_at_unix: number;
  /** Hive transaction id of the update (`object_updates.transaction_id`). */
  transaction_id: string;
  value_text: string | null;
  value_geo: { latitude: number; longitude: number } | null;
  value_json: unknown | null;
  /** Resolved HTTPS URLs for image / imageBackground / imageGalleryItem (and http(s) imageGallery text). */
  image_preview_urls: string[];
  approve_percent: number;
  for_vote_count: number;
  against_vote_count: number;
  /** Up to three usernames with latest approve votes (hover preview). */
  for_preview_voters: string[];
  /** Up to three usernames with latest reject votes (hover preview). */
  against_preview_voters: string[];
  viewer_vote: 'for' | 'against' | null;
  /** Decisive admin/trusted validity vote (LWAW/LWTW); null when curator filter or lower tiers apply. */
  decisive_privileged_vote: DecisivePrivilegedVoteDto | null;
  /** Persisted decisive rank score (0–10000); null when none. */
  rank_score: number | null;
  /** Viewer’s latest rank vote for this update (0–10000); null when not logged in or no vote. */
  viewer_rank: number | null;
};

export type ObjectUpdatesFeedResponseDto = {
  items: ObjectUpdateFeedItemDto[];
  cursor: string | null;
  hasMore: boolean;
};
