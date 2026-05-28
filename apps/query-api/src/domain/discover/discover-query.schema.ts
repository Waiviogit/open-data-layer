import { z } from 'zod';
import {
  DISCOVER_OBJECTS_DEFAULT_LIMIT,
  DISCOVER_OBJECTS_MAX_LIMIT,
  DISCOVER_USERS_DEFAULT_LIMIT,
  DISCOVER_USERS_MAX_LIMIT,
} from '../../constants/discover.constants';

export const discoverSortSchema = z.enum(['newest', 'oldest', 'rank']);
export type DiscoverSort = z.infer<typeof discoverSortSchema>;

export const discoverObjectsQuerySchema = z.object({
  object_type: z.string().min(1).optional(),
  q: z.string().max(100).optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v == null) {
        return [] as string[];
      }
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((s) => s.trim()).filter((s) => s.length > 0);
    }),
  sort: discoverSortSchema.default('newest'),
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DISCOVER_OBJECTS_MAX_LIMIT)
    .default(DISCOVER_OBJECTS_DEFAULT_LIMIT),
});
export type DiscoverObjectsQuery = z.infer<typeof discoverObjectsQuerySchema>;

export const discoverUsersQuerySchema = z.object({
  q: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DISCOVER_USERS_MAX_LIMIT)
    .default(DISCOVER_USERS_DEFAULT_LIMIT),
});
export type DiscoverUsersQuery = z.infer<typeof discoverUsersQuerySchema>;

export const discoverTagCategoriesQuerySchema = z.object({
  object_type: z.string().min(1),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v == null) {
        return [] as string[];
      }
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((s) => s.trim()).filter((s) => s.length > 0);
    }),
});
export type DiscoverTagCategoriesQuery = z.infer<typeof discoverTagCategoriesQuerySchema>;
