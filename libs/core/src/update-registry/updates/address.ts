import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelSchema, postalCodeSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_ADDRESS: UpdateDefinition = {
  update_type: UPDATE_TYPES.ADDRESS,
  semantic_key: 'address',
  namespace: 'schema',
  localizable: false,
  description:
    'Structured physical/postal address (vCard/RFC 6350 naming). ' +
    'street: street name and number; locality: city, village, or town; ' +
    'postal_code: ZIP or postal code; country: country name; ' +
    'state (optional): state, province, or region; suite (optional): apartment, unit, or floor.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    street: labelSchema,
    suite: labelSchema.optional(),
    locality: labelSchema,
    state: labelSchema.optional(),
    postal_code: postalCodeSchema,
    country: labelSchema,
  }),
};
