import { z } from 'zod';

const recencyPayloadSchema = z.object({
  kind: z.literal('recency'),
  /** Driver/JSON may deliver unix as string — coerce for stable keyset paging. */
  created_at_unix: z.coerce.number().int(),
  update_id: z.string().min(1),
});

const approvalPayloadSchema = z.object({
  kind: z.literal('approval'),
  offset: z.coerce.number().int().min(0),
});

const updatesCursorSchema = z.discriminatedUnion('kind', [
  recencyPayloadSchema,
  approvalPayloadSchema,
]);

export type UpdatesRecencyCursorPayload = z.infer<typeof recencyPayloadSchema>;
export type UpdatesApprovalCursorPayload = z.infer<typeof approvalPayloadSchema>;
export type UpdatesCursorPayload = z.infer<typeof updatesCursorSchema>;

export function encodeUpdatesCursor(payload: UpdatesCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeUpdatesCursor(raw: string): UpdatesCursorPayload | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    const result = updatesCursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
