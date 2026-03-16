import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GALLERY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.GALLERY_ITEM,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    album: z.string().min(1),
    value: z.string().min(1),
  }),
};
