import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_URL: UpdateDefinition = {
  update_type: UPDATE_TYPES.URL,
  semantic_key: 'url',
  namespace: 'schema',
  localizable: false,
  description: 'URL or web link.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.url(),
};
