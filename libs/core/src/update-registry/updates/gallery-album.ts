import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GALLERY_ALBUM: UpdateDefinition = {
  update_type: UPDATE_TYPES.GALLERY_ALBUM,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
