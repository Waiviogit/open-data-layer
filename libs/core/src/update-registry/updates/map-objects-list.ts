import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_OBJECTS_LIST: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECTS_LIST,
  description: 'List of object IDs shown on map.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: objectIdSchema,
};
