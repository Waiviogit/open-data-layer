import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MENU_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.MENU_ITEM,
  description: 'Menu item or dish entry.',
  value_kind: 'json',
  cardinality: 'multi',
  /** Either link_to_object or link_to_web must be provided. */
  schema: z
    .object({
      title: z.string().min(1),
      style: z.string().min(1),
      image: z.string().optional(),
      link_to_object: z.string().optional(),
      object_type: z.string().optional(),
      link_to_web: z.string().url().optional(),
    })
    .refine((v) => v.link_to_object !== undefined || v.link_to_web !== undefined, {
      message: 'Either link_to_object or link_to_web is required',
    }),
};
