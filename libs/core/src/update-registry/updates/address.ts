import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_ADDRESS: UpdateDefinition = {
  update_type: UPDATE_TYPES.ADDRESS,
  description:
    'Structured physical/postal address (vCard/RFC 6350 naming). ' +
    'street: street name and number; locality: city, village, or town; ' +
    'postal_code: ZIP or postal code; country: country name; ' +
    'state (optional): state, province, or region; suite (optional): apartment, unit, or floor.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    street: z.string().min(1),
    locality: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(1),
    state: z.string().min(1).optional(),
    suite: z.string().min(1).optional(),
  }),
};
