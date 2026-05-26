import type { ProjectedObject } from '../projected-object.types';
import { baseJsonLdFields } from './fields';

export function buildPersonJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  return baseJsonLdFields(obj, canonical, 'Person');
}
