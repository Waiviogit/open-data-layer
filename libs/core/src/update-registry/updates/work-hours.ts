import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WORK_HOURS: UpdateDefinition = {
  update_type: UPDATE_TYPES.WORK_HOURS,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'workHours',
  description: 'Opening hours or work schedule.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
