import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

const mapViewSchema = z.object({
  /** [lon, lat] — lon: -180..180, lat: -90..90 */
  top_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  bottom_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  zoom: z.number().int().min(1).max(18),
});

export const UPDATE_MAP_DESKTOP_VIEW: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_DESKTOP_VIEW,
  description: 'Map desktop view (bounds, center, zoom).',
  value_kind: 'json',
  cardinality: 'single',
  schema: mapViewSchema,
};
