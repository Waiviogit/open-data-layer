import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { descriptionSchema, labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_METADATA_SCHEMA = z.object({
  key: labelSchema,
  value: descriptionSchema,
});

export const UPDATE_METADATA: UpdateDefinition = {
  update_type: UPDATE_TYPES.METADATA,
  namespace: 'odl',
  localizable: false,
  description: 'Skill metadata key/value pair (projected as one object).',
  value_kind: 'json',
  cardinality: 'multi',
  schema: UPDATE_METADATA_SCHEMA,
};
