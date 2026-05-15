import { z } from 'zod';

import { projectedObjectViewSchema } from '@/modules/feed/application/dto/feed-story.dto';

/** JSON from query-api `POST /query/v1/objects/resolve`. Preserves extra keys (e.g. hoisted `parent`). */
export const projectedObjectWithCountsSchema = projectedObjectViewSchema
  .extend({
    followers_count: z.number().int(),
    updates_count: z.number().int(),
    administrative_count: z.number().int().default(0),
    ownership_count: z.number().int().default(0),
  })
  .passthrough();

export type ProjectedObjectWithCountsView = z.infer<
  typeof projectedObjectWithCountsSchema
>;
