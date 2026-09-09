import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { phoneSchema } from '../schemas/string-schemas';
import { UPDATE_STRING_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TELEPHONE_SCHEMA = z.object({
  title: z.string().max(UPDATE_STRING_MAX.TELEPHONE_TITLE).optional(),
  value: phoneSchema,
});

export const UPDATE_TELEPHONE: UpdateDefinition = {
  update_type: UPDATE_TYPES.TELEPHONE,
  semantic_key: 'telephone',
  namespace: 'schema',
  localizable: true,
  description: 'Phone number or contact.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: UPDATE_TELEPHONE_SCHEMA,
};
