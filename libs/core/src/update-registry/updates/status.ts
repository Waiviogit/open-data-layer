import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const OBJECT_STATUS_VALUES = [
  'active',
  'relisted',
  'unavailable',
  'nsfw',
  'flagged',
] as const;

export type ObjectStatus = (typeof OBJECT_STATUS_VALUES)[number];

export const UPDATE_STATUS: UpdateDefinition = {
  update_type: UPDATE_TYPES.STATUS,
  namespace: 'odl',
  localizable: false,
  description: 'Status payload (title and link).',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    title: z.enum(OBJECT_STATUS_VALUES),
    link: z.string().min(1),
  }),
};
