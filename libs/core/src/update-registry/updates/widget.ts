import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WIDGET: UpdateDefinition = {
  update_type: UPDATE_TYPES.WIDGET,
  namespace: 'odl',
  localizable: false,
  description: 'Widget or embed configuration.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    column: z.string().min(1),
    type: z.string().min(1),
    content: z.string().min(1),
  }),
};
