import { z } from 'zod';

// ---------------------------------------------------------------------------
// Per-action payload schemas
// ---------------------------------------------------------------------------

export const objectCreatePayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  object_type: z.string().min(1).max(64),
  creator: z.string().min(1).max(32),
  transaction_id: z.string().min(1).max(256),
});

export type ObjectCreatePayload = z.infer<typeof objectCreatePayloadSchema>;

export const updateCreatePayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  update_type: z.string().min(1),
  creator: z.string().min(1).max(32),
  transaction_id: z.string().min(1).max(256),
  locale: z.string().min(2).max(35).optional(),
});

export type UpdateCreatePayload = z.infer<typeof updateCreatePayloadSchema>;

/** update_id from payload references an existing update; object_id may be included as additional property. */
export const updateVotePayloadSchema = z.object({
  update_id: z.string().min(1).max(256),
  object_id: z.string().min(1).max(256).optional(),
  voter: z.string().min(1).max(32),
  vote: z.enum(['for', 'against', 'remove']),
  transaction_id: z.string().min(1).max(256),
});

export type UpdateVotePayload = z.infer<typeof updateVotePayloadSchema>;

export const rankVotePayloadSchema = z.object({
  update_id: z.string().min(1).max(256),
  object_id: z.string().min(1).max(256).optional(),
  voter: z.string().min(1).max(32),
  rank: z.number().int().min(0).max(10000),
  rank_context: z.string().max(64).default('default'),
  transaction_id: z.string().min(1).max(256),
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
    'update_user_metadata',
    'user_shop_deselect',
    'batch_import',
  ]),
  v: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const odlEnvelopeSchema = z.object({
  events: z.array(odlEventSchema).min(1),
});

export type OdlEnvelope = z.infer<typeof odlEnvelopeSchema>;
export type OdlEvent = z.infer<typeof odlEventSchema>;

/** Single event shape for IPFS batch files (same as on-chain envelope events). */
export const odlEnvelopeEventSchema = odlEventSchema;
