import type { ProjectedObject } from '../projected-object.types';
import { baseJsonLdFields, fieldString } from './fields';

export function buildBookJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  return {
    ...baseJsonLdFields(obj, canonical, 'Book'),
    ...(fieldString(obj.fields, 'author')
      ? { author: fieldString(obj.fields, 'author') }
      : {}),
    ...(fieldString(obj.fields, 'publisher')
      ? { publisher: fieldString(obj.fields, 'publisher') }
      : {}),
    ...(fieldString(obj.fields, 'datePublished')
      ? { datePublished: fieldString(obj.fields, 'datePublished') }
      : {}),
    ...(fieldString(obj.fields, 'printLength')
      ? { numberOfPages: fieldString(obj.fields, 'printLength') }
      : {}),
  };
}
