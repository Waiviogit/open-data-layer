import { z } from 'zod';
import { registry } from './registry';

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const userProfileViewSchema = registry.register(
  'UserProfileView',
  z.object({
    name: z.string().openapi({ description: 'Hive account name (primary key).' }),
    displayName: z.string().openapi({
      description:
        'Display name: `alias`, then `posting_json_metadata.profile.name`, then `name`.',
    }),
    bio: z.string().openapi({ description: 'About text from posting metadata.' }),
    avatarUrl: z.string().nullable().openapi({
      description: '`profile_image` or `posting_json_metadata.profile.profile_image`.',
    }),
    coverImageUrl: z.string().nullable().openapi({
      description: '`posting_json_metadata.profile.cover_image`.',
    }),
    followerCount: z.number().int().openapi({ description: '`followers_count`.' }),
    followingCount: z.number().int().openapi({ description: '`users_following_count`.' }),
    postingCount: z.number().int().openapi({ description: '`post_count`.' }),
    reputation: z.number().int().openapi({ description: '`object_reputation`.' }),
  }),
);

const accountNameParam = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9.-]+$/)
  .openapi({
    param: {
      name: 'name',
      in: 'path',
      required: true,
    },
    description: 'Hive account name (URL segment).',
    example: 'demo',
  });

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/profile',
  summary: 'Get user profile by account name',
  description:
    'Loads `accounts_current` by `name`, maps display fields from `alias`, `profile_image`, and parsed `posting_json_metadata`.',
  request: {
    params: z.object({ name: accountNameParam }),
  },
  responses: {
    200: {
      description: 'Public profile fields for the shell UI.',
      content: {
        'application/json': {
          schema: userProfileViewSchema,
        },
      },
    },
    404: {
      description: 'No row in `accounts_current` for `name`.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
