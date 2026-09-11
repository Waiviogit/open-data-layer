import { z } from 'zod';
import {
  imageCidOrUrlJsonSchema,
  MAX_GROUP_CHANNEL_CREATE_INVITEES,
} from '@opden-data-layer/core';
import { HIVE_MEMO_CIPHERTEXT_REGEX } from '@opden-data-layer/hive-memo-crypto';

const hiveAccountSchema = z.string().min(1).max(32);

const messageEncryptionSchema = z
  .object({
    v: z.literal(1),
    mode: z.enum(['memo', 'ephemeral']),
    to: hiveAccountSchema,
  })
  .strict();

export const hiveEngineDepositPayloadSchema = z
  .object({
    author: z.string().min(1).max(32),
    destination: z.string().min(1).max(32),
    symbol_in: z.string().min(1).max(32),
    symbol_out: z.string().min(1).max(32),
    pair: z.string().min(1).max(512),
    ex_rate: z.number().finite(),
    memo: z.string().max(8192).optional(),
    deposit_account: z.string().min(1).max(32).optional(),
    address: z.string().min(1).max(256).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAccount = Boolean(data.deposit_account?.trim());
    const hasAddress = Boolean(data.address?.trim());
    if (hasAccount === hasAddress) {
      ctx.addIssue({
        code: 'custom',
        message:
          'hive_engine_deposit: provide exactly one of deposit_account or address',
      });
    }
  });

export type HiveEngineDepositPayload = z.infer<
  typeof hiveEngineDepositPayloadSchema
>;

export const updateUserNotificationSettingsPayloadSchema = z
  .object({
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
    messages: z.boolean().optional().default(true),
    obl: z.boolean().optional().default(true),
  })
  .strict();

export type UpdateUserNotificationSettingsPayload = z.infer<
  typeof updateUserNotificationSettingsPayloadSchema
>;

/**
 * Full `user_metadata` row (minus `account`, which is always `ctx.creator` on-chain).
 * Replaces the entire row on upsert (legacy: full document overwrite).
 */
export const updateUserMetadataPayloadSchema = z
  .object({
    notifications_last_timestamp: z.number().int(),
    exit_page_setting: z.boolean(),
    locale: z.string().min(1).max(64),
    /** JSONB (`JsonValue`-like); must be JSON-serializable for Postgres. */
    post_locales: z.any().superRefine((value, ctx) => {
      try {
        JSON.stringify(value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'post_locales must be JSON-serializable',
        });
      }
    }),
    nightmode: z.boolean(),
    reward_setting: z.enum(['HP', '50', 'HIVE']),
    rewrite_links: z.boolean(),
    show_nsfw_posts: z.boolean(),
    upvote_setting: z.boolean(),
    vote_percent: z.number().int().min(0).max(10000),
    voting_power: z.boolean(),
    currency: z.union([z.string(), z.null()]),
    hide_linked_objects: z.boolean(),
    hide_recipe_objects: z.boolean(),
    hide_favorite_objects: z.boolean().default(false),
  })
  .strict();

export type UpdateUserMetadataPayload = z.infer<typeof updateUserMetadataPayloadSchema>;

// ---------------------------------------------------------------------------
// OSL messaging payloads
// ---------------------------------------------------------------------------

export const channelCreatePayloadSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('group'),
      channel_id: z.string().min(1).max(256),
      title: z.string().max(256).optional(),
      image: imageCidOrUrlJsonSchema.optional(),
      members: z
        .array(hiveAccountSchema)
        .min(1)
        .max(MAX_GROUP_CHANNEL_CREATE_INVITEES)
        .optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('object'),
      channel_id: z.string().min(1).max(256),
      object_id: z.string().min(1).max(256),
      title: z.string().max(256).optional(),
      image: imageCidOrUrlJsonSchema.optional(),
    })
    .strict(),
]);

export type ChannelCreatePayload = z.infer<typeof channelCreatePayloadSchema>;

export const channelAliasRegisterPayloadSchema = z
  .object({
    alias: z.string().min(1).max(512),
    channel_id: z.string().min(1).max(256),
  })
  .strict();

export const channelMemberPayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256),
    account: hiveAccountSchema,
  })
  .strict();

export const channelLeavePayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256),
    successor_admin: hiveAccountSchema.optional(),
    delete_my_messages: z.boolean().optional(),
  })
  .strict();

export const channelUpdatePayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256),
    title: z.string().max(256).optional(),
    image: imageCidOrUrlJsonSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.title === undefined && data.image === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of title or image is required',
      });
    }
  });

export const messageCreatePayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256).optional(),
    peer: hiveAccountSchema.optional(),
    members: z.array(hiveAccountSchema).length(2).optional(),
    body: z.string().max(65535).optional(),
    encrypted_body: z
      .string()
      .min(2)
      .max(65535)
      .regex(HIVE_MEMO_CIPHERTEXT_REGEX)
      .optional(),
    encryption: messageEncryptionSchema.optional(),
    overflow_ref: z.string().min(1).max(512).optional(),
    reply_to: z.string().min(1).max(256).optional(),
    quote_json: z.record(z.string(), z.unknown()).optional(),
    attachments: z.array(z.record(z.string(), z.unknown())).optional(),
    mentions: z.array(hiveAccountSchema).optional(),
    original_created_at_unix: z.number().int().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasBody = data.body !== undefined && data.body !== '';
    const hasOverflow = data.overflow_ref !== undefined && data.overflow_ref !== '';
    const hasEncrypted =
      data.encrypted_body !== undefined && data.encrypted_body !== '';
    if (!hasBody && !hasOverflow && !hasEncrypted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either body, overflow_ref, or encrypted_body is required',
      });
    }
    if (hasBody && hasEncrypted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide body or encrypted_body, not both',
      });
    }
    const hasEncryptedBody = data.encrypted_body !== undefined;
    const hasEncryption = data.encryption !== undefined;
    if (hasEncryptedBody !== hasEncryption) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'encrypted_body and encryption must be provided together',
      });
    }
    const hasChannel = data.channel_id !== undefined;
    const hasPeer = data.peer !== undefined;
    const hasMembers = data.members !== undefined;
    if (!hasChannel && !hasPeer && !hasMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'channel_id, peer, or members is required',
      });
    }
    if (hasPeer && hasMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide peer or members, not both',
      });
    }
  });

export type MessageCreatePayload = z.infer<typeof messageCreatePayloadSchema>;

export const messageDeletePayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256),
    message_id: z.string().min(1).max(256),
  })
  .strict();

export const messageUpdatePayloadSchema = z
  .object({
    channel_id: z.string().min(1).max(256),
    message_id: z.string().min(1).max(256),
    body: z.string().min(1).max(65535),
  })
  .strict();

export type MessageUpdatePayload = z.infer<typeof messageUpdatePayloadSchema>;

export const messageContextExcludePayloadSchema = z
  .object({
    message_id: z.string().min(1).max(256),
  })
  .strict();

const oslMessagingActions = [
  'channel_create',
  'channel_alias_register',
  'channel_member_add',
  'channel_member_remove',
  'channel_leave',
  'channel_update',
  'message_create',
  'message_update',
  'message_delete',
  'message_context_exclude',
] as const;

export const OSL_MESSAGING_ACTIONS = oslMessagingActions;

const oslEventSchema = z.object({
  action: z.enum([
    'hive_engine_deposit',
    'update_user_notification_settings',
    'update_user_metadata',
    ...oslMessagingActions,
  ]),
  v: z.number().int().min(1),
  event_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const oslEnvelopeSchema = z.object({
  events: z.array(oslEventSchema).min(1),
});

export type OslEnvelope = z.infer<typeof oslEnvelopeSchema>;
