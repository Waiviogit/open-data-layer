import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_PRODUCT_ID_TYPES: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES,
  description: 'Supported product ID types for affiliate.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().toLowerCase(),
};
