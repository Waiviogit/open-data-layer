import { z } from 'zod';

export const objectUpdatesFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  update_type: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  sort: z.enum(['recency', 'approval']).default('recency'),
});

export type ObjectUpdatesFeedQuery = z.infer<typeof objectUpdatesFeedQuerySchema>;

export type ObjectUpdateFeedItemDto = {
  update_id: string;
  object_id: string;
  update_type: string;
  creator: string;
  creator_wobjects_weight: number;
  locale: string | null;
  created_at_unix: number;
  value_text: string | null;
  value_geo: { latitude: number; longitude: number } | null;
  value_json: unknown | null;
  /** Resolved HTTPS URLs for image / imageBackground / imageGalleryItem (and http(s) imageGallery text). */
  image_preview_urls: string[];
  approve_percent: number;
  for_vote_count: number;
  against_vote_count: number;
  viewer_vote: 'for' | 'against' | null;
};

export type ObjectUpdatesFeedResponseDto = {
  items: ObjectUpdateFeedItemDto[];
  cursor: string | null;
  hasMore: boolean;
};
