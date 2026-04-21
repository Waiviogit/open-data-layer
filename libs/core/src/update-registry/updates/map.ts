import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** GeoJSON Point: coordinates[0] = longitude, coordinates[1] = latitude */
const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90), // latitude
  ]),
});

export const UPDATE_MAP: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP,
  semantic_key: 'geo',  
  namespace: 'schema',
  localizable: false,
  description: 'GeoJSON Point (longitude, latitude).',
  value_kind: 'geo',
  cardinality: 'single',
  schema: geoPointSchema,
};
