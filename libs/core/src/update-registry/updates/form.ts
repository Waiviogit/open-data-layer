import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_FORM: UpdateDefinition = {
  update_type: UPDATE_TYPES.FORM,
  namespace: 'odl',
  localizable: true,
  description: 'Form or input configuration.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    title: z.string().min(1),
    column: z.string().min(1),
    form: z.string().min(1),
    link: z.string().min(1),
  }),
};
