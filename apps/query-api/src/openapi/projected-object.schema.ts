import { z } from 'zod';

import { registry } from './registry';

/**
 * Public JSON shape for {@link import('../domain/object-projection/projected-object.types').ProjectedObject}.
 */
export const projectedObjectOpenApiSchema = registry.register(
  'ProjectedObject',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    semantic_type: z.string().nullable(),
    fields: z.record(z.string(), z.unknown()),
    hasAdministrativeAuthority: z.boolean(),
    hasOwnershipAuthority: z.boolean(),
    seo: z.record(z.string(), z.unknown()).optional(),
  }),
);
