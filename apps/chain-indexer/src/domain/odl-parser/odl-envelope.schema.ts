import { z } from 'zod';
import { cidSchema } from '@opden-data-layer/core';
import { OSL_MESSAGING_ACTIONS } from '../osl-parser/osl-envelope.schema';

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

/**
 * Rank vote: either references an existing `update_id`, or targets the `update_create`
 * event identified by `create_event_id` in the same custom_json envelope (same Hive trx).
 */
export const rankVotePayloadSchema = z
  .object({
    update_id: z.string().min(1).max(256).optional(),
    create_event_id: z.string().uuid().optional(),
    object_id: z.string().min(1).max(256).optional(),
    voter: z.string().min(1).max(32),
    rank: z.number().int().min(0).max(10000),
    rank_context: z.string().max(64).default('default'),
  })
  .superRefine((data, ctx) => {
    if (data.update_id == null && data.create_event_id == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either update_id or create_event_id is required',
      });
    }
  });

export type RankVotePayload = z.infer<typeof rankVotePayloadSchema>;

export const objectFavoritePayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  method: z.enum(['add', 'remove']),
});

export type ObjectFavoritePayload = z.infer<typeof objectFavoritePayloadSchema>;

export const objectOwnershipPayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  method: z.enum(['add', 'remove']),
  ownership_type: z.enum(['exclusive', 'supervised']).default('exclusive'),
});

export type ObjectOwnershipPayload = z.infer<typeof objectOwnershipPayloadSchema>;

export const userShopDeselectPayloadSchema = z.object({
  object_id: z.string().min(1).max(256),
  method: z.enum(['add', 'remove']),
});

export type UserShopDeselectPayload = z.infer<typeof userShopDeselectPayloadSchema>;

export const batchImportPayloadSchema = z.object({
  type: z.literal('ipfs'),
  ref: cidSchema.refine((v) => !/[\s/]/.test(v), { message: 'Invalid CID' }),
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
    'object_favorite',
    'object_ownership',
    'object_follow',
    'user_follow',
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

/** IPFS batch child events: ODL object actions plus OSL replay actions. */
const batchImportChildEventSchema = z.object({
  action: z.enum([
    'object_create',
    'update_create',
    'update_vote',
    'rank_vote',
    'object_favorite',
    'object_ownership',
    'user_shop_deselect',
    'update_user_metadata',
    'batch_import',
    ...OSL_MESSAGING_ACTIONS,
  ]),
  v: z.number().int().min(1),
  event_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export { batchImportChildEventSchema };
