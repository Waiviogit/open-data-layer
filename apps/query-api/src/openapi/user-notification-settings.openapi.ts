import { z } from 'zod';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const forbiddenSchema = z.object({
  statusCode: z.literal(403),
  message: z.string(),
  error: z.string(),
});

const userNotificationSettingsViewSchema = registry.register(
  'UserNotificationSettingsView',
  z.object({
    follow: z.boolean(),
    reblog: z.boolean(),
    reply: z.boolean(),
    mention: z.boolean(),
    vote: z.boolean(),
    downvote: z.boolean(),
    claimed_object_updates: z.boolean(),
    group_id_control: z.boolean(),
    followed_user_threads: z.boolean(),
    transfer: z.boolean(),
    fill_order: z.boolean(),
    power_up: z.boolean(),
    claim_reward: z.boolean(),
    witness_vote: z.boolean(),
    my_post: z.boolean(),
    my_comment: z.boolean(),
    my_like: z.boolean(),
    minimal_transfer: z.number(),
    messages: z.boolean(),
    obl: z.boolean(),
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
  path: '/query/v1/users/{name}/notification-settings',
  tags: [queryApiOpenApiTags.users],
  summary: 'Get notification settings for the authenticated viewer',
  description:
    'Returns `user_notification_settings` for the account when `X-Viewer` matches `:name`; otherwise 403. Missing row returns Mongo-migration defaults.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'x-viewer': z.string().openapi({
        description: 'Hive account of the viewer; must match `:name`.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Notification preference toggles.',
      content: {
        'application/json': {
          schema: userNotificationSettingsViewSchema,
        },
      },
    },
    403: {
      description: 'Viewer does not match account.',
      content: {
        'application/json': {
          schema: forbiddenSchema,
        },
      },
    },
  },
});
