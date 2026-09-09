import type { UpdateDefinition } from '../types';
import { shortTokenArraySchema } from '../schemas/string-schemas';
import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_OBJECT_TYPES: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECT_TYPES,
  description: 'Object types shown on map.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'json',
  cardinality: 'single',
  schema: shortTokenArraySchema(UPDATE_ARRAY_MAX.MAP_OBJECT_TYPES).min(1),
};
