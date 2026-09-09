import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import {
  shortTokenSchema,
  titleSchema,
  urlStringSchema,
} from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_FORM: UpdateDefinition = {
  update_type: UPDATE_TYPES.FORM,
  namespace: 'odl',
  localizable: true,
  description: 'Form or input configuration.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    title: titleSchema,
    column: shortTokenSchema,
    form: shortTokenSchema,
    link: urlStringSchema,
  }),
};
