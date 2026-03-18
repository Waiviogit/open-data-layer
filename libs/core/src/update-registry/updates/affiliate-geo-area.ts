import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_GEO_AREA: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_GEO_AREA,
  description: 'Affiliate geo or region targeting.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
