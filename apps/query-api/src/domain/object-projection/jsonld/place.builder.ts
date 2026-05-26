import type { ProjectedObject } from '../projected-object.types';
import {
  baseJsonLdFields,
  fieldString,
  geoCoordinates,
  objectAddress,
  objectGeo,
  postalAddress,
} from './fields';

export function buildPlaceJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
  type: 'Place' | 'LocalBusiness' | 'Restaurant',
): Record<string, unknown> {
  const address = objectAddress(obj.fields);
  const geo = objectGeo(obj.fields);
  const telephone = fieldString(obj.fields, 'telephone');
  const email = fieldString(obj.fields, 'email');
  const website = fieldString(obj.fields, 'website') ?? fieldString(obj.fields, 'link');

  return {
    ...baseJsonLdFields(obj, canonical, type),
    ...(address ? { address: postalAddress(address) } : {}),
    ...(geo ? { geo: geoCoordinates(geo) } : {}),
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(website ? { sameAs: website } : {}),
  };
}
