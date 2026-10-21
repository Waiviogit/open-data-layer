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
    status: z.string(),
    weight: z.number().nullable(),
    fields: z.record(z.string(), z.unknown()),
    isFavorited: z.boolean(),
    hasSupervisedOwnership: z.boolean(),
    hasExclusiveOwnership: z.boolean(),
    hasOwnershipAuthority: z
      .boolean()
      .describe('True when viewer has supervised or exclusive ownership (legacy aggregate flag).'),
    seo: projectedObjectSeoOpenApiSchema.optional(),
    affiliateLinks: z
      .array(
        z.object({
          link: z.string(),
          image: z.string(),
          affiliateCode: z.string(),
          type: z.string(),
          objectId: z.string(),
        }),
      )
      .optional()
      .describe(
        'Merchant affiliate URLs for this object when identifier + affiliate program match. Absent when no links apply.',
      ),
  }),
);
