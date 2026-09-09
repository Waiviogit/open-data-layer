import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';
import {
  OBJECT_STATUS_VALUES,
  type ObjectStatus,
} from '@opden-data-layer/odl-db-types';

export { OBJECT_STATUS_VALUES, type ObjectStatus };

/** Allowed `value_json.title` values for `update_type: status` (includes update-only `protected`). */
export const STATUS_UPDATE_TITLE_VALUES = [
  'active',
  'protected',
  ...(OBJECT_STATUS_VALUES.filter((s) => s !== 'active') as Array<
    Exclude<ObjectStatus, 'active'>
  >),
] as const;

export type StatusUpdateTitle = (typeof STATUS_UPDATE_TITLE_VALUES)[number];

/** Statuses allowed on direct object page resolve (`/object/:id`). Currently all core values. */
export const OBJECT_PAGE_VISIBLE_STATUSES: readonly ObjectStatus[] =
  OBJECT_STATUS_VALUES;

/** Maps a winning status update title to `objects_core.status`. */
export function mapStatusUpdateTitleToCoreStatus(
  title: StatusUpdateTitle,
): ObjectStatus {
  if (title === 'protected' || title === 'active') {
    return 'active';
  }
  return title;
}

export const UPDATE_STATUS_SCHEMA = z
  .object({
    title: z.enum(STATUS_UPDATE_TITLE_VALUES),
    link: objectIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.title === 'relisted' && !data.link?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['link'],
        message: 'Link is required when status is relisted',
      });
    }
  });

export const UPDATE_STATUS: UpdateDefinition = {
  update_type: UPDATE_TYPES.STATUS,
  namespace: 'odl',
  localizable: false,
  description: 'Status payload (title and link).',
  value_kind: 'json',
  cardinality: 'single',
  schema: UPDATE_STATUS_SCHEMA,
};
