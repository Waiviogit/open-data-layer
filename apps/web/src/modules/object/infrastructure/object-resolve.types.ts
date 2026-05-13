import { z } from 'zod';

import { projectedObjectViewSchema } from '@/modules/feed/application/dto/feed-story.dto';

/** JSON from query-api `POST /query/v1/objects/resolve`. */
export const projectedObjectWithCountsSchema = projectedObjectViewSchema.extend({
  followers_count: z.number().int(),
  updates_count: z.number().int(),
});

export type ProjectedObjectWithCountsView = z.infer<
  typeof projectedObjectWithCountsSchema
>;
