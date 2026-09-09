import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { titleSchema, urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WEBSITE: UpdateDefinition = {
  update_type: UPDATE_TYPES.WEBSITE,
  namespace: 'odl',
  localizable: true,
  description: 'Website or main URL.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    title: titleSchema,
    link: urlStringSchema,
  }),
};
