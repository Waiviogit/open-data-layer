import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MERCHANT: UpdateDefinition = {
  update_type: UPDATE_TYPES.MERCHANT,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'merchant',
  description: 'Merchant or seller reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: z.string().min(3).max(256),
};
