import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_DATE_PUBLISHED: UpdateDefinition = {
  update_type: UPDATE_TYPES.DATE_PUBLISHED,
  description: 'Publication or release date.',
  namespace: 'schema',
  localizable: false,
  semantic_key: 'datePublished',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
