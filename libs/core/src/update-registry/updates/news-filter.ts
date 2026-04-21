import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/**
 * allow_list: array of "allowed" rules (each rule is an array of strings).
 * ignore_list: array of "ignore" rules.
 * type_list: array of object type names.
 */
export const UPDATE_NEWS_FILTER: UpdateDefinition = {
  update_type: UPDATE_TYPES.NEWS_FILTER,
  description: 'News feed filter configuration.',
  value_kind: 'json',
  cardinality: 'single',
  namespace: 'odl',
  localizable: false,
  schema: z.object({
    allow_list: z.array(z.array(z.string())),
    ignore_list: z.array(z.string()),
    type_list: z.array(z.string()),
  }),
};
