import type { ProjectedObject, ProjectedObjectSeo } from './projected-object.types';

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * `JSON.stringify` drops keys whose values are `undefined`. API consumers (Zod on the web)
 * expect explicit `null` / `""` / `{}` for projected object fields.
 */
export function normalizeProjectedObjectForJson(input: ProjectedObject): ProjectedObject {
  const rawFields = input.fields;
  const fields: Record<string, unknown> = isPlainRecord(rawFields) ? { ...rawFields } : {};

  const base: ProjectedObject = {
    object_id: input.object_id,
    object_type: input.object_type ?? '',
    semantic_type: input.semantic_type ?? null,
    fields,
    hasAdministrativeAuthority: input.hasAdministrativeAuthority ?? false,
    hasOwnershipAuthority: input.hasOwnershipAuthority ?? false,
  };

  const seo = input.seo;
  if (seo != null && typeof seo === 'object' && !Array.isArray(seo)) {
    const s = seo as ProjectedObjectSeo;
    return {
      ...base,
      seo: {
        title: s.title ?? null,
        description: s.description ?? null,
        canonical_url: s.canonical_url ?? null,
        json_ld: isPlainRecord(s.json_ld) ? { ...s.json_ld } : {},
      },
    };
  }

  return base;
}
