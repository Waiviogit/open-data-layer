import { z } from 'zod';

/** Hive `vote` operation payload (operation[1]). */
export const voteOperationSchema = z.object({
  voter: z.string().min(1),
  author: z.string().min(1),
  permlink: z.string().min(1),
  weight: z.coerce.number().int().min(-10000).max(10000),
});

export type VoteOperationPayload = z.infer<typeof voteOperationSchema>;
