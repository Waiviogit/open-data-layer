import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_FOLLOWERS: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_FOLLOWERS,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)),
};
