import { z } from 'zod';

const cursorPayloadSchema = z.object({
  feedAt: z.coerce.number().int(),
  author: z.string().min(1),
  permlink: z.string().min(1),
});

export type FeedCursorPayload = z.infer<typeof cursorPayloadSchema>;

export function encodeFeedCursor(payload: FeedCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeFeedCursor(raw: string): FeedCursorPayload | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    const result = cursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
