import { z } from 'zod';

export const userBlogFeedBodySchema = z.preprocess(
  (data) => (data === undefined || data === null ? {} : data),
  z.object({
    limit: z.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
  }),
);

export type UserBlogFeedBody = z.infer<typeof userBlogFeedBodySchema>;
