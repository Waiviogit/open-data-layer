import type { ProjectedObject } from '../projected-object.types';
import { baseJsonLdFields, buildOffer, fieldString } from './fields';

export function buildServiceJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  const price = fieldString(obj.fields, 'price');
  return {
    ...baseJsonLdFields(obj, canonical, 'Service'),
    ...(price ? { offers: buildOffer(price) } : {}),
  };
}
