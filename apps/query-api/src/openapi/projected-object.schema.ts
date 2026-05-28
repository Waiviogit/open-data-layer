import { z } from 'zod';

import { registry } from './registry';

export const projectedObjectSeoOpenApiSchema = registry.register(
  'ProjectedObjectSeo',
  z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    canonical_url: z.string().nullable(),
    json_ld: z.record(z.string(), z.unknown()),
    keywords: z.array(z.string()).nullable(),
  }),
);

/**
 * Public JSON shape for {@link import('../domain/object-projection/projected-object.types').ProjectedObject}.
 */
export const projectedObjectOpenApiSchema = registry.register(
  'ProjectedObject',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    semantic_type: z.string().nullable(),
    weight: z.number().nullable(),
    fields: z.record(z.string(), z.unknown()),
    hasAdministrativeAuthority: z.boolean(),
    hasOwnershipAuthority: z.boolean(),
    seo: projectedObjectSeoOpenApiSchema.optional(),
  }),
);
