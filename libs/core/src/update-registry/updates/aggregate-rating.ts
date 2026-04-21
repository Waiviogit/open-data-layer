import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AGGREGATE_RATING: UpdateDefinition = {
  update_type: UPDATE_TYPES.AGGREGATE_RATING,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'aggregateRating',
  description: 'Rating or review value.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
