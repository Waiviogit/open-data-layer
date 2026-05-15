import { z } from 'zod';

/** query-api / pg driver may JSON-serialize numeric columns as strings */
const num = () => z.coerce.number();

const valueGeoSchema = z.object({
  latitude: num(),
  longitude: num(),
});

export const objectUpdateFeedItemDtoSchema = z.object({
  update_id: z.string(),
  object_id: z.string(),
  update_type: z.string(),
  creator: z.string(),
  creator_wobjects_weight: num(),
  locale: z.string().nullable(),
  created_at_unix: num().pipe(z.number().int()),
  value_text: z.string().nullable(),
  value_geo: valueGeoSchema.nullable(),
  value_json: z.unknown().nullable(),
  image_preview_urls: z.array(z.string()).default([]),
  approve_percent: num(),
  for_vote_count: num().pipe(z.number().int()),
  against_vote_count: num().pipe(z.number().int()),
  viewer_vote: z.enum(['for', 'against']).nullable(),
});

export const objectUpdatesFeedResponseSchema = z.object({
  items: z.array(objectUpdateFeedItemDtoSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type ObjectUpdateFeedItemView = z.infer<typeof objectUpdateFeedItemDtoSchema>;
export type ObjectUpdatesFeedPageView = z.infer<typeof objectUpdatesFeedResponseSchema>;
