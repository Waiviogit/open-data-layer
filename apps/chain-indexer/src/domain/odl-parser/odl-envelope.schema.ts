import { z } from 'zod';

// ---------------------------------------------------------------------------
// Per-action payload schemas
// ---------------------------------------------------------------------------

export const objectCreatePayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  object_type: z.string().min(1).max(64),
  creator: z.string().min(1).max(32),
});

export type ObjectCreatePayload = z.infer<typeof objectCreatePayloadSchema>;

export const updateCreatePayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  update_type: z.string().min(1),
  creator: z.string().min(1).max(32),
  locale: z.string().min(2).max(35).optional(),
});

export type UpdateCreatePayload = z.infer<typeof updateCreatePayloadSchema>;

/**
 * Vote payload: either references an existing `update_id`, or targets the `update_create`
 * event identified by `create_event_id` in the same custom_json envelope (same Hive trx).
 */
export const updateVotePayloadSchema = z
  .object({
    update_id: z.string().min(1).max(256).optional(),
    create_event_id: z.string().uuid().optional(),
    object_id: z.string().min(1).max(256).optional(),
    voter: z.string().min(1).max(32),
    vote: z.enum(['for', 'against', 'remove']),
  })
  .superRefine((data, ctx) => {
    if (data.update_id == null && data.create_event_id == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either update_id or create_event_id is required',
      });
    }
  });

export type UpdateVotePayload = z.infer<typeof updateVotePayloadSchema>;

export const rankVotePayloadSchema = z.object({
  update_id: z.string().min(1).max(256),
  object_id: z.string().min(1).max(256).optional(),
  voter: z.string().min(1).max(32),
  rank: z.number().int().min(0).max(10000),
  rank_context: z.string().max(64).default('default'),
});

export type RankVotePayload = z.infer<typeof rankVotePayloadSchema>;

export const authorityPayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  authority_type: z.enum(['ownership', 'administrative']),
  method: z.enum(['add', 'remove']),
});

export type AuthorityPayload = z.infer<typeof authorityPayloadSchema>;

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
  })
  .strict();

export type UpdateUserMetadataPayload = z.infer<typeof updateUserMetadataPayloadSchema>;

export const userShopDeselectPayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  method: z.enum(['add', 'remove']),
});

export type UserShopDeselectPayload = z.infer<typeof userShopDeselectPayloadSchema>;

export const batchImportPayloadSchema = z.object({
  type: z.literal('ipfs'),
  ref: z.string().min(1),
});

export type BatchImportPayload = z.infer<typeof batchImportPayloadSchema>;

export const objectFollowPayloadSchema = z
  .object({
    object_id: z.string().min(1).max(256),
    method: z.enum(['follow', 'unfollow', 'bell']),
    bell: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'bell' && data.bell === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bell is required when method is bell',
        path: ['bell'],
      });
    }
  });

export type ObjectFollowPayload = z.infer<typeof objectFollowPayloadSchema>;

export const userFollowPayloadSchema = z.object({
  following: z.string().min(1).max(32),
  method: z.literal('bell'),
  bell: z.boolean(),
});

export type UserFollowPayload = z.infer<typeof userFollowPayloadSchema>;

// ---------------------------------------------------------------------------
// Envelope schema
// ---------------------------------------------------------------------------

const odlEventSchema = z.object({
  action: z.enum([
    'object_create',
    'update_create',
    'update_vote',
    'rank_vote',
    'object_authority',
    'object_follow',
    'user_follow',
    'update_user_metadata',
    'user_shop_deselect',
    'batch_import',
  ]),
  v: z.number().int().min(1),
  /** Client correlation id for same-envelope linkage (e.g. create + vote in one broadcast). */
  event_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const odlEnvelopeSchema = z.object({
  events: z.array(odlEventSchema).min(1),
});

export type OdlEnvelope = z.infer<typeof odlEnvelopeSchema>;
export type OdlEvent = z.infer<typeof odlEventSchema>;

/** Single event shape for IPFS batch files (same as on-chain envelope events). */
export const odlEnvelopeEventSchema = odlEventSchema;
