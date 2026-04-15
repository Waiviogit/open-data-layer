import { z } from 'zod';

/** Hive `comment` operation payload (operation[1]). */
export const commentOperationPayloadSchema = z.object({
  parent_author: z.string(),
  parent_permlink: z.string(),
  author: z.string(),
  permlink: z.string(),
  title: z.string(),
  body: z.string(),
  json_metadata: z.string(),
});

export type CommentOperationPayload = z.infer<typeof commentOperationPayloadSchema>;

/** Hive `delete_comment` operation payload. */
export const deleteCommentOperationPayloadSchema = z.object({
  author: z.string().min(1),
  permlink: z.string().min(1),
});

export type DeleteCommentOperationPayload = z.infer<
  typeof deleteCommentOperationPayloadSchema
>;
