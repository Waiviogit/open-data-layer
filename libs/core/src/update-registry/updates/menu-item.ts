import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Button/menu row visual style (legacy Waivio: Standard, Highlight, Icon, Image). */
export const MENU_ITEM_STYLES = ['standard', 'highlight', 'icon', 'image'] as const;

export type MenuItemStyle = (typeof MENU_ITEM_STYLES)[number];

const menuItemStyleSchema = z.enum(MENU_ITEM_STYLES);

/**
 * Menu row JSON. Rules:
 * - At least one of `link_to_object` or `link_to_web`.
 * - If `link_to_object` is set: `object_type` is required; `title` optional.
 * - If `link_to_web` is set: `title` required (non-empty after trim).
 * - If both links are set, both rule sets apply.
 */
export const UPDATE_MENU_ITEM_SCHEMA = z
  .object({
    title: z.string().optional(),
    style: menuItemStyleSchema,
    image: z.string().optional(),
    link_to_object: z.string().min(3).max(256).optional(),
    object_type: z.string().optional(),
    link_to_web: z.url().optional(),
  })
  .refine((v) => v.link_to_object !== undefined || v.link_to_web !== undefined, {
    message: 'Either link_to_object or link_to_web is required',
  })
  .refine(
    (v) => {
      if (v.link_to_object !== undefined && v.link_to_object.trim().length >= 3) {
        return (v.object_type?.trim() ?? '').length > 0;
      }
      return true;
    },
    { message: 'object_type is required when link_to_object is set', path: ['object_type'] },
  )
  .refine(
    (v) => {
      if (v.link_to_web !== undefined) {
        return (v.title?.trim() ?? '').length > 0;
      }
      return true;
    },
    { message: 'title is required when link_to_web is set', path: ['title'] },
  );

export const UPDATE_MENU_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.MENU_ITEM,
  description: 'Menu item or dish entry.',
  value_kind: 'json',
  cardinality: 'multi',
  namespace: 'odl',
  localizable: true,
  schema: UPDATE_MENU_ITEM_SCHEMA,
};
