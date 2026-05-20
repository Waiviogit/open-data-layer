import { z } from 'zod';

export const searchCountsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export type SearchCountsQuery = z.infer<typeof searchCountsQuerySchema>;
