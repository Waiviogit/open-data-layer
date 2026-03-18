import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: activates global object authority control. Single cardinality. @see spec/governance-resolution.md §2, §8 */
export const UPDATE_OBJECT_CONTROL: UpdateDefinition = {
  update_type: UPDATE_TYPES.OBJECT_CONTROL,
  description: 'Governance: activates global object authority control.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.enum(['full']),
};
