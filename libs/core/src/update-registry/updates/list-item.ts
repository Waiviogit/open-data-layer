import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LIST_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.LIST_ITEM,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
