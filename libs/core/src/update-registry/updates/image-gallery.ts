import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE_GALLERY: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_GALLERY,
  namespace: 'odl',
  localizable: false,
  description: 'Image gallery album or collection reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: labelSchema,
};
