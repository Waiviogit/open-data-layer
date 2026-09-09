import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { bodySchema, shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WIDGET: UpdateDefinition = {
  update_type: UPDATE_TYPES.WIDGET,
  namespace: 'odl',
  localizable: true,
  description: 'Widget or embed configuration.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    column: shortTokenSchema,
    type: shortTokenSchema,
    content: bodySchema,
  }),
};
