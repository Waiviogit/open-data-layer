import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** GeoJSON Point stored in `value_geo` / PostGIS (coordinates: [longitude, latitude]). */
export type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number];
};

const latLonSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export function latLonToGeoJsonPoint(input: {
  latitude: number;
  longitude: number;
}): GeoJsonPoint {
  return {
    type: 'Point',
    coordinates: [input.longitude, input.latitude],
  };
}

export const UPDATE_GEO: UpdateDefinition = {
  update_type: UPDATE_TYPES.GEO,
  semantic_key: 'geo',
  namespace: 'schema',
  localizable: false,
  description: 'Latitude and longitude; stored as GeoJSON Point in the database.',
  value_kind: 'geo',
  cardinality: 'single',
  schema: latLonSchema,
};
