import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelArraySchema } from '../schemas/string-schemas';
import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_INGREDIENTS: UpdateDefinition = {
  update_type: UPDATE_TYPES.INGREDIENTS,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'ingredients',
  description: 'Recipe ingredients list.',
  value_kind: 'json',
  cardinality: 'single',
  schema: labelArraySchema(UPDATE_ARRAY_MAX.INGREDIENTS).min(1),
};
