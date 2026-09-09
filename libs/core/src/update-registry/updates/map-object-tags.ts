import type { UpdateDefinition } from '../types';
import { shortTokenArraySchema } from '../schemas/string-schemas';
import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_OBJECT_TAGS: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECT_TAGS,
  description: 'Tags filter for map objects.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'json',
  cardinality: 'single',
  schema: shortTokenArraySchema(UPDATE_ARRAY_MAX.MAP_OBJECT_TAGS),
};
