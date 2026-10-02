import { z } from 'zod';
import { resolveObjectBodySchema } from '../domain/objects/schemas/resolve-object.schema';
import { resolveNestedObjectsBodySchema } from '../domain/objects/schemas/resolve-nested-objects.schema';
import { objectOptionsResponseSchema } from '../domain/objects/schemas/object-options.schema';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import {
  paginatedUserFollowListOpenApiSchema,
  subscriptionSortEnum,
} from './users-social.openapi';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const projectedObjectWithCountsSchema = registry.register(
  'ProjectedObjectWithCounts',
  projectedObjectOpenApiSchema.extend({
    followers_count: z.number().int(),
    experts_count: z.number().int(),
    posts_count: z.number().int(),
    updates_count: z.number().int(),
    favorited_by_count: z.number().int(),
    supervised_count: z.number().int(),
    exclusive_count: z.number().int(),
    is_following: z.boolean(),
    viewer_bell: z.boolean(),
    update_type_counts: z.record(z.string(), z.number().int()),
    update_locales: z.array(z.string()),
  }),
);

const badRequestSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  issues: z.unknown().optional(),
});

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const objectExpertListItemSchema = registry.register(
  'ObjectExpertListItem',
  z.object({
    name: z.string().openapi({ description: '`accounts_current.name`' }),
    avatarUrl: z.string().nullable().openapi({
      description:
        'Profile avatar from `posting_json_metadata.profile.profile_image`, falling back to `json_metadata.profile.profile_image`, then `accounts_current.profile_image`.',
    }),
    objectExpertiseWeight: z
      .number()
      .openapi({ description: '`user_object_expertise.weight` for this object (not global wobjects_weight).' }),
    usersFollowingCount: z
      .number()
      .openapi({ description: '`accounts_current.users_following_count` (followers of this account).' }),
    isCurrentFollowing: z.boolean().openapi({
      description:
        'True when the request viewer (`X-Viewer`) has a `user_subscriptions` edge to this account.',
    }),
  }),
);

const paginatedObjectExpertListOpenApiSchema = registry.register(
  'PaginatedObjectExpertList',
  z.object({
    items: z.array(objectExpertListItemSchema),
    total: z.number().int(),
    hasMore: z.boolean(),
  }),
);

const resolveObjectRequestSchema = registry.register('ResolveObjectBody', resolveObjectBodySchema);

registry.registerPath({
  method: 'post',
  path: '/query/v1/objects/resolve',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Resolve projected object by id',
  description:
    'Loads aggregated DB rows for `object_id`, resolves fields via `ObjectViewService`, projects to `ProjectedObject` JSON (IPFS URLs, ref summaries, authority flags). When `update_types` is omitted or empty, every update type present on the object is resolved. Loads `objects_core` rows for any lifecycle status (object page); discovery endpoints still restrict to `status = active`. Includes `followers_count` from `user_object_follows`, `experts_count` from `user_object_expertise` (accounts with `weight > 0` on this object), `posts_count` from `post_objects` (Reviews feed size), `updates_count` as total rows in `object_updates`, `update_type_counts` as per-type row counts from `object_updates`, `update_locales` as distinct non-null locales from `object_updates`, and `favorited_by_count`, `supervised_count`, and `exclusive_count` from `object_favorite` / `object_ownership` for this object. When `X-Viewer` is set, includes `is_following` and `viewer_bell` from `user_object_follows` for that account and object. The `fields.aggregateRating` value (when requested) is an array of aspect rows: `{ update_id, dimension, averageRating (0–10000 or null), userRating (viewer’s vote when `X-Viewer` is set, 0–10000 or null), totalVoters }` from `rank_votes` aggregates. Returns 404 when the object does not exist.',
  request: {
    headers: z.object({
      'accept-language': z.string().optional().openapi({
        example: 'en-US',
        description: 'Preferred locale (first BCP-47 tag is used).',
      }),
      'x-locale': z.string().optional().openapi({
        description: 'When valid, overrides `Accept-Language`.',
      }),
      'x-governance-object-id': z.string().optional().openapi({
        description:
          'Optional governance object ID; resolved and merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
      }),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account viewing the object; used for `isFavorited`, `hasSupervisedOwnership`, `hasExclusiveOwnership`, `hasOwnershipAuthority`, and each `fields.aggregateRating[]` row\'s `userRating` (resolved from `rank_votes` for that viewer, latest `event_seq` per aspect `update_id`).',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: resolveObjectRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Projected object with follower, update, and authority counts.',
      content: {
        'application/json': {
          schema: projectedObjectWithCountsSchema,
        },
      },
    },
    400: {
      description: 'Request body validation failed (Zod).',
      content: {
        'application/json': {
          schema: badRequestSchema,
        },
      },
    },
    404: {
      description: 'No `objects_core` row for `object_id`, non-active `status`, or object not returned by resolution.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

const nestedObjectViewSchema = registry.register(
  'NestedObjectView',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    fields: z.record(z.string(), z.unknown()).openapi({
      description: 'Projected fields keyed by update type id.',
    }),
  }),
);

const resolveNestedObjectsResponseSchema = registry.register(
  'ResolveNestedObjectsResponse',
  z.object({
    items: z.array(nestedObjectViewSchema),
  }),
);

const resolveNestedObjectsRequestSchema = registry.register(
  'ResolveNestedObjectsBody',
  resolveNestedObjectsBodySchema,
);

registry.registerPath({
  method: 'post',
  path: '/query/v1/objects/resolve-nested',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Batch lightweight nested object projections',
  description:
    'Resolves up to 32 objects with a lightweight `NestedObjectView` shape (`object_id`, `object_type`, `fields` only — no authority flags, SEO, or counts). When `update_types` is omitted or an empty array, resolves the nested navigation defaults: `listItem`, `sortCustom`, `pageContent`, `legalText`, `skillContent`, `name`. When `update_types` is a non-empty array, only those registry update types are resolved. `object_ref` targets inside resolved fields are expanded using the internal ref-summary set (not controlled by this parameter).',
  request: {
    headers: z.object({
      'accept-language': z.string().optional().openapi({
        example: 'en-US',
        description: 'Preferred locale (first BCP-47 tag is used).',
      }),
      'x-locale': z.string().optional().openapi({
        description: 'When valid, overrides `Accept-Language`.',
      }),
      'x-governance-object-id': z.string().optional().openapi({
        description:
          'Optional governance object ID; resolved and merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
      }),
      'x-viewer': z.string().optional().openapi({
        description: 'Optional Hive account for governance masking and ref expansion.',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: resolveNestedObjectsRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Lightweight projected objects in request id order (missing ids omitted).',
      content: {
        'application/json': {
          schema: resolveNestedObjectsResponseSchema,
        },
      },
    },
    400: {
      description: 'Request body validation failed (Zod).',
      content: {
        'application/json': {
          schema: badRequestSchema,
        },
      },
    },
  },
});

const objectExistsResponseSchema = registry.register(
  'ObjectExistsResponse',
  z.object({
    exists: z.boolean().openapi({
      description: 'True when an active `objects_core` row exists for `object_id`.',
    }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/exists',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Check whether an object id is already taken',
  description:
    'Returns `{ exists: true }` when `objects_core` has an active row for `object_id`; otherwise `{ exists: false }`. Used by the object-create workspace for availability checks.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
  },
  responses: {
    200: {
      description: 'Availability flag for the given object id.',
      content: {
        'application/json': {
          schema: objectExistsResponseSchema,
        },
      },
    },
  },
});

const objectOptionsOpenApiSchema = registry.register(
  'ObjectOptionsResponse',
  objectOptionsResponseSchema,
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/options',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Aggregated product variant options by category',
  description:
    'Returns option rows grouped by category for the requested object and all active siblings sharing `meta_group_id`. Each entry includes the owning `object_id`, optional `image`, `price`, and `imageUrl` from that variant. When the object type does not support the `option` update, returns `{ options: {} }`. Returns 404 when the object does not exist.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Grouped variant options for the object (may be empty).',
      content: {
        'application/json': {
          schema: objectOptionsOpenApiSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/followers',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List accounts that follow the object',
  description:
    'Joins `user_object_follows` (where `object_id` matches an active object) with `accounts_current`. Sort options match user-profile followers (`rank`, `followers`, `a-z`, `recency` on follow edge or account fields). Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = object follow created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated follower accounts.',
      content: {
        'application/json': {
          schema: paginatedUserFollowListOpenApiSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/experts',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List accounts with expertise on the object',
  description:
    'Joins `user_object_expertise` (where `object_id` matches an active object and `weight > 0`) with `accounts_current`. Sorted by per-object expertise weight descending. Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated expert accounts for the object.',
      content: {
        'application/json': {
          schema: paginatedObjectExpertListOpenApiSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/favorited-by',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List accounts that favorited the object',
  description:
    'Joins `object_favorite` (for an active object) with `accounts_current`. Sort options match user-profile followers (`rank`, `followers`, `a-z`, `recency` on favorite edge or account fields). Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = favorite row created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated favorited-by accounts.',
      content: {
        'application/json': {
          schema: paginatedUserFollowListOpenApiSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/ownership',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List accounts with exclusive or supervised ownership on the object',
  description:
    'Joins `object_ownership` (for an active object) with `accounts_current`. Filter rows with `ownership_type` (`exclusive` | `supervised`). Sort options match user-profile followers. Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      ownership_type: z.enum(['exclusive', 'supervised']).openapi({
        description: 'Which ownership role to list.',
      }),
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = ownership row created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated ownership accounts.',
      content: {
        'application/json': {
          schema: paginatedUserFollowListOpenApiSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

const refSummaryOpenApiSchema = registry.register(
  'RefSummary',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    fields: z.record(z.string(), z.unknown()),
    weight: z.number().nullable(),
    addedAtUnix: z.number().optional(),
    listItemsCount: z.number().int().optional(),
    isFavorited: z.boolean().optional(),
  }),
);

const objectRefListResponseSchema = registry.register(
  'ObjectRefListResponse',
  z.object({
    items: z.array(refSummaryOpenApiSchema),
    hasMore: z.boolean(),
    cursor: z.string().nullable(),
  }),
);

const objectRefListQueryOpenApi = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().openapi({
    description: 'Page size (default 20, max 50).',
  }),
  cursor: z.string().optional().openapi({
    description: 'Offset cursor (numeric string) for the next page.',
  }),
});

function registerObjectRefListPath(
  pathSuffix: 'related' | 'similar' | 'add-on',
  summary: string,
  description: string,
): void {
  registry.registerPath({
    method: 'get',
    path: `/query/v1/objects/{objectId}/${pathSuffix}`,
    tags: [queryApiOpenApiTags.objects],
    summary,
    description,
    request: {
      params: z.object({
        objectId: z
          .string()
          .min(1)
          .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
      }),
      query: objectRefListQueryOpenApi,
      headers: z.object({
        'accept-language': z.string().optional().openapi({
          description: 'Preferred locale (first BCP-47 tag is used).',
        }),
        'x-locale': z.string().optional().openapi({
          description: 'When valid, overrides `Accept-Language`.',
        }),
        'x-governance-object-id': z.string().optional().openapi({
          description:
            'Optional governance object ID; merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
        }),
        'x-viewer': z.string().optional().openapi({
          description:
            'Optional Hive account; sets `isFavorited` on each ref when the viewer favorited that object.',
        }),
      }),
    },
    responses: {
      200: {
        description: 'Paginated referenced objects.',
        content: {
          'application/json': {
            schema: objectRefListResponseSchema,
          },
        },
      },
      404: {
        description: 'Object not found or not active.',
        content: {
          'application/json': {
            schema: notFoundSchema,
          },
        },
      },
    },
  });
}

registerObjectRefListPath(
  'related',
  'List related objects',
  'Returns VALID `isRelatedTo` refs on the source object first, then backfills from `object_categories` using legacy close-products **related** rules: categories whose global count is ≥ the average across the source object’s categories; matches objects in any of those categories. Excludes the source object, its `meta_group_id` option siblings, explicit refs, and those refs’ groups. Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor` (default page size 20, max 50).',
);
registerObjectRefListPath(
  'similar',
  'List similar objects',
  'Returns VALID `isSimilarTo` refs first, then backfills from `object_categories` using legacy **similar** rules: iterate source categories sorted by global count ascending; one category at a time, excluding objects that share already-used categories. Excludes the source object, its `meta_group_id` option siblings, explicit refs, and those refs’ groups. Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor`.',
);
registerObjectRefListPath(
  'add-on',
  'List add-on objects',
  'Returns VALID `addOn` refs on the source object first, then backfills with objects that have an `addOn` update pointing at the source object id (reverse add-on). Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor`.',
);

const objectFieldReferenceGroupSchema = registry.register(
  'ObjectFieldReferenceGroup',
  z.object({
    objectType: z.string(),
    items: z.array(refSummaryOpenApiSchema),
    hasMore: z.boolean(),
  }),
);

const objectFieldReferencesSummaryResponseSchema = registry.register(
  'ObjectFieldReferencesSummaryResponse',
  z.object({
    groups: z.array(objectFieldReferenceGroupSchema),
  }),
);

const objectFieldReferencesSummaryQueryOpenApi = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().openapi({
    description: 'Preview page size per group (default 6).',
  }),
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/field-references',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List field-reference previews',
  description:
    'For `person` or `business` source objects, returns preview groups of active objects that reference the source via schema fields (`author`, `merchant`, `manufacturer`, `brand`, `publisher`). Each group is keyed by target object type (`book`, `product`). Response rows are compact `RefSummary` projections.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: objectFieldReferencesSummaryQueryOpenApi,
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Grouped field-reference previews.',
      content: {
        'application/json': {
          schema: objectFieldReferencesSummaryResponseSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
    422: {
      description: 'Source object type does not support field references.',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/field-references/{referenceObjectType}',
  tags: [queryApiOpenApiTags.objects],
  summary: 'List field references by target type',
  description:
    'Paginated objects of `referenceObjectType` that reference the source object via configured schema fields. Source must be `person` or `business`. Pagination: numeric offset `cursor`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
      referenceObjectType: z.string().min(1).openapi({
        param: { name: 'referenceObjectType', in: 'path', required: true },
      }),
    }),
    query: objectRefListQueryOpenApi,
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated referencing objects.',
      content: {
        'application/json': {
          schema: objectRefListResponseSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
    422: {
      description: 'Unsupported source or reference object type.',
    },
  },
});

const relatedAlbumImageSchema = z.object({
  url: z.string(),
  postAuthor: z.string(),
  postPermlink: z.string(),
});

const relatedAlbumPreviewResponseSchema = z.object({
  count: z.number().int(),
  items: z.array(relatedAlbumImageSchema),
});

const relatedAlbumListResponseSchema = z.object({
  count: z.number().int(),
  items: z.array(relatedAlbumImageSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable(),
});

const relatedAlbumHeaders = z.object({
  'accept-language': z.string().optional().openapi({
    description: 'Preferred locale (first BCP-47 tag is used).',
  }),
  'x-locale': z.string().optional().openapi({
    description: 'When valid, overrides `Accept-Language`.',
  }),
  'x-governance-object-id': z.string().optional().openapi({
    description:
      'Optional governance object ID; merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
  }),
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/gallery/related/preview',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Related album preview',
  description:
    'Preview images for the virtual Related gallery (post `json_metadata.image` URLs linked via `post_objects`). Excludes posts listed in object `remove` updates. Default preview size 4.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().openapi({
        description: 'Preview image count (default 4).',
      }),
    }),
    headers: relatedAlbumHeaders,
  },
  responses: {
    200: {
      description: 'Related album preview.',
      content: {
        'application/json': { schema: relatedAlbumPreviewResponseSchema },
      },
    },
    404: {
      description: 'Object not found.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/gallery/related',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Related album images',
  description:
    'Paginated images for the virtual Related gallery. Offset `cursor` (numeric string). Excludes posts in object `remove` updates.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: objectRefListQueryOpenApi,
    headers: relatedAlbumHeaders,
  },
  responses: {
    200: {
      description: 'Paginated related album images.',
      content: {
        'application/json': { schema: relatedAlbumListResponseSchema },
      },
    },
    404: {
      description: 'Object not found.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});
