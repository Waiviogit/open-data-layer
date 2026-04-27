import { z } from 'zod';

export const userThreadsFeedBodySchema = z.preprocess(
  (data) => (data === undefined || data === null ? {} : data),
  z.object({
    limit: z.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
    sort: z.enum(['latest', 'oldest']).optional().default('latest'),
  }),
);

export type UserThreadsFeedBody = z.infer<typeof userThreadsFeedBodySchema>;
