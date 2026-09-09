import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { titleSchema, urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BUTTON: UpdateDefinition = {
  update_type: UPDATE_TYPES.BUTTON,
  namespace: 'odl',
  localizable: true,
  semantic_key: 'button',
  description: 'Button or CTA configuration.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    title: titleSchema,
    link: urlStringSchema,
  }),
};
