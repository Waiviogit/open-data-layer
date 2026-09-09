import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AGGREGATE_RATING: UpdateDefinition = {
  update_type: UPDATE_TYPES.AGGREGATE_RATING,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'aggregateRating',
  description: 'Rating or review value.',
  value_kind: 'text',
  cardinality: 'multi',
  rank_aggregation: 'average',
  schema: labelSchema,
};
