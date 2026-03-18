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
  rank: z.number().int().min(1).max(10000),
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

// ---------------------------------------------------------------------------
// Envelope schema
// ---------------------------------------------------------------------------

const odlEventSchema = z.object({
  action: z.enum(['object_create', 'update_create', 'update_vote', 'rank_vote', 'object_authority']),
  v: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const odlEnvelopeSchema = z.object({
  events: z.array(odlEventSchema).min(1),
});

export type OdlEnvelope = z.infer<typeof odlEnvelopeSchema>;
export type OdlEvent = z.infer<typeof odlEventSchema>;
