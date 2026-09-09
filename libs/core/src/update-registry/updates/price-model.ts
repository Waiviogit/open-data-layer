import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_STRING_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const PRICE_MODEL_KINDS = [
  'per_call',
  'subscription',
  'per_result',
  'free',
] as const;

export const UPDATE_PRICE_MODEL_SCHEMA = z.object({
  model: z.enum(PRICE_MODEL_KINDS),
  amount: z.number().nonnegative().optional(),
  currency: z.string().max(UPDATE_STRING_MAX.PRICE_MODEL_CURRENCY).optional(),
  unit: z.string().max(UPDATE_STRING_MAX.PRICE_MODEL_UNIT).optional(),
});

export const UPDATE_PRICE_MODEL: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRICE_MODEL,
  namespace: 'odl',
  localizable: false,
  description: 'Pricing model for a service offer or request.',
  value_kind: 'json',
  cardinality: 'single',
  schema: UPDATE_PRICE_MODEL_SCHEMA,
};
