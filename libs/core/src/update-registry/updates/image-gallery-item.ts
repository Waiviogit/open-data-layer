import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE_GALLERY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  namespace: 'odl',
  localizable: false,
  description: 'Image gallery item or media entry.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    album: z.string().min(1),
    value: z.string().min(1),
  }),
};
