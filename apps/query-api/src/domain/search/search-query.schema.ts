import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  type: z.enum(['all', 'objects', 'users']).default('all'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
