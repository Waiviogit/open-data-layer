import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE_BACKGROUND: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_BACKGROUND,
  namespace: 'odl',
  localizable: true,
  description: 'Background image or cover URL.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.url(),
};
