import type { ProjectedObject } from '../projected-object.types';

export function fieldString(
  fields: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = fields[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function objectName(obj: ProjectedObject): string | undefined {
  return fieldString(obj.fields, 'name');
}

export function objectDescription(obj: ProjectedObject): string | undefined {
  return fieldString(obj.fields, 'description');
}

export function objectImage(obj: ProjectedObject): string | undefined {
  return (
    fieldString(obj.fields, 'imageBackground') ?? fieldString(obj.fields, 'image')
  );
}

export type AddressFields = {
  street: string;
  locality: string;
  postal_code: string;
  country: string;
  state?: string;
  suite?: string;
};

export function objectAddress(
  fields: Record<string, unknown>,
): AddressFields | undefined {
  const raw = fields.address;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const address = raw as Record<string, unknown>;
  const street = fieldString(address, 'street');
  const locality = fieldString(address, 'locality');
  const postal_code = fieldString(address, 'postal_code');
  const country = fieldString(address, 'country');
  if (!street || !locality || !postal_code || !country) {
    return undefined;
  }
  return {
    street,
    locality,
    postal_code,
    country,
    ...(fieldString(address, 'state') ? { state: fieldString(address, 'state') } : {}),
    ...(fieldString(address, 'suite') ? { suite: fieldString(address, 'suite') } : {}),
  };
}

export function postalAddress(address: AddressFields): Record<string, unknown> {
  return {
    '@type': 'PostalAddress',
    streetAddress: address.suite
      ? `${address.street}, ${address.suite}`
      : address.street,
    addressLocality: address.locality,
    postalCode: address.postal_code,
    addressCountry: address.country,
    ...(address.state ? { addressRegion: address.state } : {}),
  };
}

export function objectGeo(
  fields: Record<string, unknown>,
): { latitude: number; longitude: number } | undefined {
  const raw = fields.geo;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const geo = raw as Record<string, unknown>;
  const latitude = geo.latitude;
  const longitude = geo.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined;
  }
  return { latitude, longitude };
}

export function geoCoordinates(
  geo: { latitude: number; longitude: number },
): Record<string, unknown> {
  return {
    '@type': 'GeoCoordinates',
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

export function stringArrayField(
  fields: Record<string, unknown>,
  key: string,
): string[] {
  const raw = fields[key];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function buildOffer(price: string): Record<string, unknown> {
  return {
    '@type': 'Offer',
    price,
    priceCurrency: 'USD',
  };
}

export function baseJsonLdFields(
  obj: ProjectedObject,
  canonical: string | null,
  type: string,
): Record<string, unknown> {
  const name = objectName(obj);
  const description = objectDescription(obj);
  const image = objectImage(obj);
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(canonical ? { url: canonical } : {}),
    identifier: obj.object_id,
  };
}
