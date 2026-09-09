import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import {
  hiveAccountNameArraySchema,
  labelArraySchema,
  shortTokenSchema,
} from '../schemas/string-schemas';
import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SHOP_FILTER: UpdateDefinition = {
  update_type: UPDATE_TYPES.SHOP_FILTER,
  description: 'Shop catalog filter configuration.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    type: shortTokenSchema,
    departments: labelArraySchema(UPDATE_ARRAY_MAX.SHOP_FILTER_LIST).optional(),
    tags: labelArraySchema(UPDATE_ARRAY_MAX.SHOP_FILTER_LIST).optional(),
    authorities: hiveAccountNameArraySchema.optional(),
  }),
};
