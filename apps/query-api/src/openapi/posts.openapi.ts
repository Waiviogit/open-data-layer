import { z } from 'zod';
import { registry } from './registry';

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const singlePostViewSchema = registry.register(
  'SinglePostView',
  z.object({
    id: z.string(),
    author: z.string(),
    permlink: z.string(),
    title: z.string(),
    excerpt: z.string(),
    body: z.string(),
    createdAt: z.string().datetime({ offset: true }),
    feedAt: z.string().datetime({ offset: true }),
    rebloggedBy: z.string().nullable(),
    isNsfw: z.boolean(),
    category: z.string().nullable(),
    children: z.number().int(),
    pendingPayout: z.string(),
    totalPayout: z.string(),
    netRshares: z.string(),
    thumbnailUrl: z.string().nullable(),
    videoThumbnailUrl: z.string().nullable(),
    videoEmbedUrl: z.string().nullable(),
    authorProfile: z.object({
      name: z.string(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      reputation: z.number(),
    }),
    objects: z.array(
      z.object({
        objectId: z.string(),
        objectType: z.string().nullable(),
        name: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        description: z.string().nullable(),
        rating: z.string().nullable(),
        categoryItems: z.array(z.string()),
        hasAdministrativeAuthority: z.boolean(),
      }),
    ),
    votes: z.object({
      totalCount: z.number().int(),
      previewVoters: z.array(z.string()),
      voted: z.boolean(),
    }),
  }),
);

const authorParam = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9.-]+$/)
  .openapi({
    param: {
      name: 'author',
      in: 'path',
      required: true,
    },
    description: 'Hive account name (post author).',
    example: 'alice',
  });

const permlinkParam = z
  .string()
  .min(1)
  .max(255)
  .openapi({
    param: {
      name: 'permlink',
      in: 'path',
      required: true,
    },
    description: 'Hive permlink (URL segment; may require encoding).',
    example: 'my-post-title',
  });

registry.registerPath({
  method: 'get',
  path: '/query/v1/posts/{author}/{permlink}',
  summary: 'Single post by author and permlink',
  description:
    'Full post body plus tagged objects (resolved fields for linked-object cards when available) and active vote summary. Optional `X-Viewer` sets administrative heart state per object. Not found when the post row is missing.',
  request: {
    params: z.object({ author: authorParam, permlink: permlinkParam }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Hive account viewing the post; when set, linked objects include `hasAdministrativeAuthority` for administrative object_authority rows.',
        example: 'alice',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Post payload.',
      content: {
        'application/json': {
          schema: singlePostViewSchema,
        },
      },
    },
    404: {
      description: 'No `posts` row for this author/permlink.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
