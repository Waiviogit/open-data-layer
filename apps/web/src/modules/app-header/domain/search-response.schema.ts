import { z } from 'zod';

export const searchObjectResultSchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  name: z.string().nullable(),
  image_url: z.string().nullable(),
  parent_name: z.string().nullable(),
});

export const searchUserResultSchema = z.object({
  name: z.string(),
  profile_image: z.string().nullable(),
  reputation: z.number(),
  followers_count: z.number(),
  is_following: z.boolean(),
});

export const searchResponseSchema = z.object({
  objects: z.array(searchObjectResultSchema),
  users: z.array(searchUserResultSchema),
});

export const searchCountsResponseSchema = z.object({
  type_counts: z.record(z.string(), z.number()),
  total_users: z.number(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type SearchCountsResponse = z.infer<typeof searchCountsResponseSchema>;
export type SearchObjectResult = z.infer<typeof searchObjectResultSchema>;
export type SearchUserResult = z.infer<typeof searchUserResultSchema>;
