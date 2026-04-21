import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_RECTANGLES: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_RECTANGLES,
  description: 'Map rectangle or region overlays.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(
    z.object({
      /** [lon, lat] */
      top_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
      bottom_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    }),
  ),
};
