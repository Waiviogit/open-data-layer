import { z } from 'zod';

const draftListCursorPayloadSchema = z.object({
  lastUpdated: z.coerce.number().int(),
  draftId: z.string().min(1),
});

export type DraftListCursorPayload = z.infer<typeof draftListCursorPayloadSchema>;

export function encodeDraftListCursor(payload: DraftListCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeDraftListCursor(raw: string): DraftListCursorPayload | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    const result = draftListCursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
