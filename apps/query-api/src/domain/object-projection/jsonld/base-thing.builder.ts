import type { ProjectedObject } from '../projected-object.types';
import { baseJsonLdFields } from './fields';

export function buildBaseThingJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  return baseJsonLdFields(obj, canonical, 'Thing');
}
