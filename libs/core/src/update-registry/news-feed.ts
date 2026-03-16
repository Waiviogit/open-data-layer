import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_NEWS_FEED: UpdateDefinition = {
  update_type: UPDATE_TYPES.NEWS_FEED,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    allow_list: z.array(z.array(z.string())).optional(),
    ignore_list: z.array(z.string()).optional(),
    type_list: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
  }),
};
