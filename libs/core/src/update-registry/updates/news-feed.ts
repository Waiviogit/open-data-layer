import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import {
  hiveAccountNameArraySchema,
  newsFilterNestedStringArraySchema,
  newsFilterStringArraySchema,
  shortTokenArraySchema,
} from '../schemas/string-schemas';
import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_NEWS_FEED: UpdateDefinition = {
  update_type: UPDATE_TYPES.NEWS_FEED,
  namespace: 'odl',
  localizable: false,
  description: 'News feed configuration.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    allow_list: newsFilterNestedStringArraySchema.optional(),
    ignore_list: newsFilterStringArraySchema.optional(),
    type_list: shortTokenArraySchema(UPDATE_ARRAY_MAX.NEWS_LIST).optional(),
    authors: hiveAccountNameArraySchema.optional(),
  }),
};
