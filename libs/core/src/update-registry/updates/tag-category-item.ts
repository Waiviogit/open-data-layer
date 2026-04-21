import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TAG_CATEGORY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
  namespace: 'odl',
  localizable: true,
  description: 'Category or tag item with value.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    value: z.string().min(1),
    category: z.string().min(1),
  }),
};
