import type { ProjectedObject } from '../projected-object.types';
import {
  baseJsonLdFields,
  buildOffer,
  fieldString,
} from './fields';

export function buildProductJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  const price = fieldString(obj.fields, 'price');
  return {
    ...baseJsonLdFields(obj, canonical, 'Product'),
    ...(price ? { offers: buildOffer(price) } : {}),
    ...(fieldString(obj.fields, 'brand')
      ? { brand: fieldString(obj.fields, 'brand') }
      : {}),
  };
}

export function buildMenuItemJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  const price = fieldString(obj.fields, 'price');
  return {
    ...baseJsonLdFields(obj, canonical, 'MenuItem'),
    ...(price ? { offers: buildOffer(price) } : {}),
  };
}
